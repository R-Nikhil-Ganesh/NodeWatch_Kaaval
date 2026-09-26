import express from 'express';
import { query } from '../../db/index.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/legal/search?q=... — a single natural-language box across cases,
// filed documents and evidence, scoped to the same "onboarded to court"
// cases the rest of the legal portal sees (court_stage IS NOT NULL).
//
// Uses Postgres full-text search (websearch_to_tsquery), not a semantic/
// embedding-based model — there's no ML inference service in this stack.
// websearch_to_tsquery is the closest built-in equivalent: it parses a plain
// natural-language phrase (quotes, "or", "-exclude") into a tsquery and
// ranks matches by relevance rather than requiring an exact substring.
//
// Documents are matched against content_text (extracted at upload time by
// textExtractionService — PDF/DOCX/TXT only, see documentRoutes.js) in
// addition to title/description, so a filing's body text is searchable too.
router.get('/', requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (q.length < 2) return res.json([]);

    const { rows } = await query(
      `WITH parsed AS (SELECT websearch_to_tsquery('english', $1) AS tsq)
       SELECT * FROM (
         SELECT
           'case' AS "entityType",
           c.case_id AS id,
           c.case_id AS "caseId",
           c.title AS title,
           COALESCE(c.fir_number, c.cnr_number, c.case_id) AS subtitle,
           LEFT(COALESCE(c.description, ''), 200) AS snippet,
           ts_rank(
             to_tsvector('english', coalesce(c.title,'') || ' ' || coalesce(c.description,'') || ' ' || coalesce(c.fir_number,'') || ' ' || coalesce(c.cnr_number,'')),
             (SELECT tsq FROM parsed)
           ) AS rank
         FROM cases c
         WHERE c.court_stage IS NOT NULL AND c.is_deleted = FALSE
           AND to_tsvector('english', coalesce(c.title,'') || ' ' || coalesce(c.description,'') || ' ' || coalesce(c.fir_number,'') || ' ' || coalesce(c.cnr_number,''))
               @@ (SELECT tsq FROM parsed)

         UNION ALL

         SELECT
           'document' AS "entityType",
           d.document_id::text AS id,
           d.case_id AS "caseId",
           d.title AS title,
           COALESCE(d.doc_type_label, d.type::text) AS subtitle,
           COALESCE(
             NULLIF(LEFT(COALESCE(d.description, ''), 200), ''),
             LEFT(COALESCE(d.content_text, ''), 200)
           ) AS snippet,
           ts_rank(
             to_tsvector('english', coalesce(d.title,'') || ' ' || coalesce(d.description,'') || ' ' || coalesce(d.content_text,'')),
             (SELECT tsq FROM parsed)
           ) AS rank
         FROM case_documents d
         JOIN cases dc ON dc.case_id = d.case_id AND dc.court_stage IS NOT NULL AND dc.is_deleted = FALSE
         WHERE to_tsvector('english', coalesce(d.title,'') || ' ' || coalesce(d.description,'') || ' ' || coalesce(d.content_text,''))
               @@ (SELECT tsq FROM parsed)

         UNION ALL

         SELECT
           'evidence' AS "entityType",
           e.evidence_id AS id,
           e.case_id AS "caseId",
           COALESCE(e.name, e.file_name) AS title,
           e.type::text AS subtitle,
           LEFT(COALESCE(e.notes, ''), 200) AS snippet,
           ts_rank(
             to_tsvector('english', coalesce(e.name,'') || ' ' || coalesce(e.file_name,'') || ' ' || coalesce(e.notes,'')),
             (SELECT tsq FROM parsed)
           ) AS rank
         FROM evidence e
         JOIN cases ec ON ec.case_id = e.case_id AND ec.court_stage IS NOT NULL AND ec.is_deleted = FALSE
         WHERE e.is_deleted = FALSE
           AND to_tsvector('english', coalesce(e.name,'') || ' ' || coalesce(e.file_name,'') || ' ' || coalesce(e.notes,''))
               @@ (SELECT tsq FROM parsed)
       ) results
       ORDER BY rank DESC
       LIMIT 40`,
      [q]
    );

    res.json(rows);
  } catch (err) {
    console.error('[Legal Search Error]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
