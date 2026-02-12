package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing digital evidence
type SmartContract struct {
	contractapi.Contract
}

// EvidenceAsset describes the immutable details of the digital evidence
type EvidenceAsset struct {
	DocType            string `json:"docType"` // Required for CouchDB queries
	EvidenceID         string `json:"evidenceID"`
	CaseID             string `json:"caseID"`
	RawFileHash        string `json:"rawFileHash"`        // SHA-256 of the binary (detailHash)
	DetailMetadataHash string `json:"detailMetadataHash"` // SHA-256 of the evidence metadata
	AuditMetadataHash  string `json:"auditMetadataHash"`  // SHA-256 of the audit log row
	OwnerMSP           string `json:"ownerMSP"`           // MSP ID of current custodian
	SubmittedBy        string `json:"submittedBy"`        // Officer/User who submitted the evidence
	RiskLevel          string `json:"riskLevel"`          // ML Risk: LOW, MEDIUM, HIGH
	TransferTargetMSP  string `json:"transferTargetMSP"`  // For 2-step transfer
	Timestamp          string `json:"timestamp"`
}

// --- EVENT STRUCTS ---

// TransferRequestEvent is emitted when a custody transfer starts
type TransferRequestEvent struct {
	EvidenceID string `json:"evidenceID"`
	FromMSP    string `json:"fromMSP"`
	ToMSP      string `json:"toMSP"`
}

// TransferAcceptEvent is emitted when custody is finalized
type TransferAcceptEvent struct {
	EvidenceID string `json:"evidenceID"`
	NewOwner   string `json:"newOwner"`
	Timestamp  string `json:"timestamp"`
}

// ReadEvent is emitted when evidence is accessed (Audit Log)
type ReadEvent struct {
	EvidenceID string `json:"evidenceID"`
	ReaderMSP  string `json:"readerMSP"`
}

// --- END EVENT STRUCTS ---

// HistoryResult is a helper struct for parsing history data
type HistoryResult struct {
	TxId      string         `json:"txId"`
	Timestamp time.Time      `json:"timestamp"`
	Record    *EvidenceAsset `json:"record"`
	IsDelete  bool           `json:"isDelete"`
}

// InitLedger adds a dummy asset for testing
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// CreateEvidence: Freezes the file state on blockchain with all hash proofs
func (s *SmartContract) CreateEvidence(ctx contractapi.TransactionContextInterface, evidenceID string, caseID string, rawFileHash string, detailMetadataHash string, auditMetadataHash string, riskLevel string) error {
	exists, err := s.EvidenceExists(ctx, evidenceID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the evidence %s already exists", evidenceID)
	}

	clientMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)

	evidence := EvidenceAsset{
		DocType:            "Evidence",
		EvidenceID:         evidenceID,
		CaseID:             caseID,
		RawFileHash:        rawFileHash,
		DetailMetadataHash: detailMetadataHash,
		AuditMetadataHash:  auditMetadataHash,
		OwnerMSP:           clientMSP,
		SubmittedBy:        "",
		RiskLevel:          riskLevel,
		TransferTargetMSP:  "",
		Timestamp:          timeString,
	}

	evidenceJSON, err := json.Marshal(evidence)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(evidenceID, evidenceJSON)
}

// RequestTransfer initiates the custody change (Step 1 of Transfer)
func (s *SmartContract) RequestTransfer(ctx contractapi.TransactionContextInterface, evidenceID string, targetOrgMSP string) error {

	evidence, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return err
	}

	// Verify the caller is the CURRENT owner
	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	if clientMSP != evidence.OwnerMSP {
		return fmt.Errorf("only the current owner (%s) can initiate transfer", evidence.OwnerMSP)
	}

	// Set the pending target
	evidence.TransferTargetMSP = targetOrgMSP

	updatedEvidenceJSON, _ := json.Marshal(evidence)
	err = ctx.GetStub().PutState(evidenceID, updatedEvidenceJSON)
	if err != nil {
		return err
	}

	// --- EMIT EVENT: TransferAccepted (only on final accept) ---
	// Note: TransferRequested event is NOT emitted to avoid audit log pollution

	return nil
}

// AcceptTransfer completes the custody change (Step 2 of Transfer)
func (s *SmartContract) AcceptTransfer(ctx contractapi.TransactionContextInterface, evidenceID string) error {

	evidence, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return err
	}

	// Verify the caller is the TARGET organization
	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	if clientMSP != evidence.TransferTargetMSP {
		return fmt.Errorf("client %s is not the designated transfer target", clientMSP)
	}

	// Update ownership
	evidence.OwnerMSP = clientMSP
	evidence.TransferTargetMSP = "" // Clear the pending flag

	updatedEvidenceJSON, _ := json.Marshal(evidence)
	err = ctx.GetStub().PutState(evidenceID, updatedEvidenceJSON)
	if err != nil {
		return err
	}

	// --- EMIT EVENT: TransferAccepted ---
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)

	eventPayload := TransferAcceptEvent{
		EvidenceID: evidenceID,
		NewOwner:   clientMSP,
		Timestamp:  timeString,
	}
	eventJSON, err := json.Marshal(eventPayload)
	if err != nil {
		return err
	}

	err = ctx.GetStub().SetEvent("TransferAccepted", eventJSON)
	if err != nil {
		return err
	}

	return nil
}

// readEvidenceInternal is an internal helper that reads evidence without emitting events
func (s *SmartContract) readEvidenceInternal(ctx contractapi.TransactionContextInterface, evidenceID string) (*EvidenceAsset, error) {
	evidenceJSON, err := ctx.GetStub().GetState(evidenceID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if evidenceJSON == nil {
		return nil, fmt.Errorf("the evidence %s does not exist", evidenceID)
	}

	var evidence EvidenceAsset
	err = json.Unmarshal(evidenceJSON, &evidence)
	if err != nil {
		return nil, err
	}

	return &evidence, nil
}

// ReadEvidence returns the asset details and emits an audit event (explicit read)
func (s *SmartContract) ReadEvidence(ctx contractapi.TransactionContextInterface, evidenceID string) (*EvidenceAsset, error) {
	evidence, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return nil, err
	}

	// --- EMIT EVENT: EvidenceRead (audit event for explicit reads only) ---
	// WARNING: Clients must invoke this as a transaction (SubmitTransaction)
	// for the event to be committed to the ledger. If evaluated as a query,
	// this event will NOT fire.
	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()

	eventPayload := ReadEvent{
		EvidenceID: evidenceID,
		ReaderMSP:  clientMSP,
	}
	eventJSON, _ := json.Marshal(eventPayload)

	// We ignore the error here to ensure the read still returns data
	// even if event setting fails (though it rarely does).
	_ = ctx.GetStub().SetEvent("EvidenceRead", eventJSON)

	return evidence, nil
}

// QueryByCaseID: The "Group by Case" View
func (s *SmartContract) QueryByCaseID(ctx contractapi.TransactionContextInterface, caseID string) ([]*EvidenceAsset, error) {
	queryString := fmt.Sprintf(`{"selector":{"docType":"Evidence","caseID":"%s"}}`, caseID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*EvidenceAsset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var evidence EvidenceAsset
		err = json.Unmarshal(queryResponse.Value, &evidence)
		if err != nil {
			return nil, err
		}
		assets = append(assets, &evidence)
	}

	return assets, nil
}

// QueryAllEvidence: returns every EvidenceAsset. Compatible with LevelDB (range scan) and CouchDB.
func (s *SmartContract) QueryAllEvidence(ctx contractapi.TransactionContextInterface) ([]*EvidenceAsset, error) {
	// Range scan over all keys; filter by docType to avoid CouchDB-only queries.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	assets := []*EvidenceAsset{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var evidence EvidenceAsset
		if err = json.Unmarshal(queryResponse.Value, &evidence); err != nil {
			return nil, err
		}
		if evidence.DocType == "Evidence" {
			assets = append(assets, &evidence)
		}
	}

	return assets, nil
}

// GetEvidenceHistory: The Audit Log
func (s *SmartContract) GetEvidenceHistory(ctx contractapi.TransactionContextInterface, evidenceID string) ([]HistoryResult, error) {

	resultsIterator, err := ctx.GetStub().GetHistoryForKey(evidenceID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var history []HistoryResult

	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var evidence EvidenceAsset
		if !response.IsDelete {
			if errUnmarshal := json.Unmarshal(response.Value, &evidence); errUnmarshal != nil {
				return nil, errUnmarshal
			}
		}

		timestamp := response.Timestamp.AsTime()

		record := HistoryResult{
			TxId:      response.TxId,
			Timestamp: timestamp,
			Record:    &evidence,
			IsDelete:  response.IsDelete,
		}
		history = append(history, record)
	}

	return history, nil
}

func (s *SmartContract) EvidenceExists(ctx contractapi.TransactionContextInterface, evidenceID string) (bool, error) {
	evidenceJSON, err := ctx.GetStub().GetState(evidenceID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return evidenceJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating evidence chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting evidence chaincode: %s", err.Error())
	}
}
