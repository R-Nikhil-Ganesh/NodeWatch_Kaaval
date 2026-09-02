package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing digital evidence lifecycle & chain of custody
type SmartContract struct {
	contractapi.Contract
}

// EvidenceAsset describes the immutable state of digital evidence on the ledger
type EvidenceAsset struct {
	DocType            string `json:"docType"`            // "EvidenceAsset"
	EvidenceID         string `json:"evidenceID"`         // Primary key on world state
	CaseID             string `json:"caseID"`             // Associated Case ID
	SourceHash         string `json:"sourceHash"`         // SHA-256 computed at mobile edge/source
	ServerHash         string `json:"serverHash"`         // SHA-256 verified at server ingestion
	DetailMetadataHash string `json:"detailMetadataHash"` // SHA-256 of sorted metadata attributes
	OwnerMSP           string `json:"ownerMSP"`           // Current custodian MSP (e.g., PoliceMSP, FSLMSP, CourtMSP)
	Status             string `json:"status"`             // REGISTERED, TRANSFER_PENDING, IN_CUSTODY, UNDER_FORENSIC_EXAMINATION, FORENSICALLY_VERIFIED, INTEGRITY_FLAGGED, SUBMITTED_TO_COURT
	RiskLevel          string `json:"riskLevel"`          // LOW, MEDIUM, HIGH
	TransferTargetMSP  string `json:"transferTargetMSP"`  // Target MSP during transfer handshakes
	Section63Ref       string `json:"section63Ref"`       // Bharatiya Sakshya Adhiniyam Section 63 cert ref
	CreatedAt          string `json:"createdAt"`          // ISO RFC3339 timestamp
	UpdatedAt          string `json:"updatedAt"`          // ISO RFC3339 timestamp
	LastTxID           string `json:"lastTxID"`           // Last modifying Fabric Transaction ID
}

// CustodyEvent represents an append-only, immutable lifecycle/audit event
type CustodyEvent struct {
	DocType      string `json:"docType"`      // "CustodyEvent"
	EventID      string `json:"eventID"`      // Composite key EVENT_<evidenceID>_<timestamp>
	EvidenceID   string `json:"evidenceID"`   // Linked Evidence ID
	EventType    string `json:"eventType"`    // REGISTRATION, TRANSFER_INITIATED, TRANSFER_ACCEPTED, FORENSIC_SUBMISSION, FORENSIC_VERIFICATION, INTEGRITY_BREACH, COURT_SUBMISSION, READ_AUDIT
	FromMSP      string `json:"fromMSP"`      // Previous custodian MSP
	ToMSP        string `json:"toMSP"`        // New custodian MSP
	ActingMSP    string `json:"actingMSP"`    // MSP executing the transaction
	ActorID      string `json:"actorID"`      // Human officer / analyst ID
	ActorRole    string `json:"actorRole"`    // POLICE, FORENSICS, LEGAL, ADMIN
	Notes        string `json:"notes"`        // Operational remarks
	VerifiedHash string `json:"verifiedHash"` // Hash computed during forensic verification
	ResultStatus string `json:"resultStatus"` // SUCCESS, MATCH, MISMATCH, FLAGGED
	Timestamp    string `json:"timestamp"`    // ISO RFC3339 timestamp
	TxID         string `json:"txID"`         // Fabric Transaction ID
}

// HistoryResult is a helper struct for parsing state delta history
type HistoryResult struct {
	TxID      string         `json:"txId"`
	Timestamp time.Time      `json:"timestamp"`
	Record    *EvidenceAsset `json:"record"`
	IsDelete  bool           `json:"isDelete"`
}

// InitLedger initializes the contract
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// CreateEvidence: Freezes evidence source/server hashes and creates the initial asset & event
func (s *SmartContract) CreateEvidence(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	caseID string,
	sourceHash string,
	serverHash string,
	detailMetadataHash string,
	riskLevel string,
	actorID string,
	actorRole string,
) error {
	exists, err := s.EvidenceExists(ctx, evidenceID)
	if err != nil {
		return err
	}
	if exists {
		// Idempotent return if identical record exists
		existingJSON, _ := ctx.GetStub().GetState(evidenceID)
		var existing EvidenceAsset
		if errUnmarshal := json.Unmarshal(existingJSON, &existing); errUnmarshal == nil {
			if existing.SourceHash == sourceHash && existing.ServerHash == serverHash {
				return nil
			}
		}
		return fmt.Errorf("evidence %s already exists with differing attributes", evidenceID)
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
	txID := ctx.GetStub().GetTxID()

	asset := EvidenceAsset{
		DocType:            "EvidenceAsset",
		EvidenceID:         evidenceID,
		CaseID:             caseID,
		SourceHash:         sourceHash,
		ServerHash:         serverHash,
		DetailMetadataHash: detailMetadataHash,
		OwnerMSP:           clientMSP,
		Status:             "REGISTERED",
		RiskLevel:          riskLevel,
		TransferTargetMSP:  "",
		Section63Ref:       "",
		CreatedAt:          timeString,
		UpdatedAt:          timeString,
		LastTxID:           txID,
	}

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	if err := ctx.GetStub().PutState(evidenceID, assetJSON); err != nil {
		return err
	}

	// Create and persist the append-only Registration Event
	eventKey := fmt.Sprintf("EVENT_%s_%d", evidenceID, txTimestamp.Seconds)
	custodyEvent := CustodyEvent{
		DocType:      "CustodyEvent",
		EventID:      eventKey,
		EvidenceID:   evidenceID,
		EventType:    "REGISTRATION",
		FromMSP:      "",
		ToMSP:        clientMSP,
		ActingMSP:    clientMSP,
		ActorID:      actorID,
		ActorRole:    actorRole,
		Notes:        fmt.Sprintf("Evidence %s registered for case %s with source hash verification", evidenceID, caseID),
		VerifiedHash: serverHash,
		ResultStatus: "SUCCESS",
		Timestamp:    timeString,
		TxID:         txID,
	}

	eventJSON, _ := json.Marshal(custodyEvent)
	if err := ctx.GetStub().PutState(eventKey, eventJSON); err != nil {
		return err
	}

	_ = ctx.GetStub().SetEvent("EvidenceCreated", eventJSON)
	return nil
}

// InitiateTransfer: Step 1 of Custody Transfer — current custodian designates a target MSP
func (s *SmartContract) InitiateTransfer(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	targetMSP string,
	actorID string,
	actorRole string,
	notes string,
) error {
	asset, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return err
	}

	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	if clientMSP != asset.OwnerMSP {
		return fmt.Errorf("only the current owner (%s) can initiate transfer, caller is %s", asset.OwnerMSP, clientMSP)
	}

	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	txID := ctx.GetStub().GetTxID()

	asset.TransferTargetMSP = targetMSP
	asset.Status = "TRANSFER_PENDING"
	asset.UpdatedAt = timeString
	asset.LastTxID = txID

	updatedJSON, _ := json.Marshal(asset)
	if err := ctx.GetStub().PutState(evidenceID, updatedJSON); err != nil {
		return err
	}

	// Append Transfer Initiated Event
	eventKey := fmt.Sprintf("EVENT_%s_%d", evidenceID, txTimestamp.Seconds)
	custodyEvent := CustodyEvent{
		DocType:      "CustodyEvent",
		EventID:      eventKey,
		EvidenceID:   evidenceID,
		EventType:    "TRANSFER_INITIATED",
		FromMSP:      clientMSP,
		ToMSP:        targetMSP,
		ActingMSP:    clientMSP,
		ActorID:      actorID,
		ActorRole:    actorRole,
		Notes:        notes,
		ResultStatus: "PENDING",
		Timestamp:    timeString,
		TxID:         txID,
	}
	eventJSON, _ := json.Marshal(custodyEvent)
	_ = ctx.GetStub().PutState(eventKey, eventJSON)
	_ = ctx.GetStub().SetEvent("TransferInitiated", eventJSON)

	return nil
}

// AcceptTransfer: Step 2 of Custody Transfer — target MSP signs and accepts custody
func (s *SmartContract) AcceptTransfer(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	actorID string,
	actorRole string,
	notes string,
) error {
	asset, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return err
	}

	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	if clientMSP != asset.TransferTargetMSP {
		return fmt.Errorf("caller %s is not designated transfer target (%s)", clientMSP, asset.TransferTargetMSP)
	}

	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	txID := ctx.GetStub().GetTxID()
	prevMSP := asset.OwnerMSP

	asset.OwnerMSP = clientMSP
	asset.TransferTargetMSP = ""
	asset.Status = "IN_CUSTODY"
	asset.UpdatedAt = timeString
	asset.LastTxID = txID

	updatedJSON, _ := json.Marshal(asset)
	if err := ctx.GetStub().PutState(evidenceID, updatedJSON); err != nil {
		return err
	}

	// Append Transfer Accepted Event
	eventKey := fmt.Sprintf("EVENT_%s_%d", evidenceID, txTimestamp.Seconds)
	custodyEvent := CustodyEvent{
		DocType:      "CustodyEvent",
		EventID:      eventKey,
		EvidenceID:   evidenceID,
		EventType:    "TRANSFER_ACCEPTED",
		FromMSP:      prevMSP,
		ToMSP:        clientMSP,
		ActingMSP:    clientMSP,
		ActorID:      actorID,
		ActorRole:    actorRole,
		Notes:        notes,
		ResultStatus: "SUCCESS",
		Timestamp:    timeString,
		TxID:         txID,
	}
	eventJSON, _ := json.Marshal(custodyEvent)
	_ = ctx.GetStub().PutState(eventKey, eventJSON)
	_ = ctx.GetStub().SetEvent("TransferAccepted", eventJSON)

	return nil
}

// SubmitForForensics: Transfers custody or submits evidence to Forensic Science Laboratories (FSL)
func (s *SmartContract) SubmitForForensics(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	fslMSP string,
	actorID string,
	actorRole string,
	notes string,
) error {
	asset, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return err
	}

	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	if clientMSP != asset.OwnerMSP {
		return fmt.Errorf("only current custodian can submit for examination")
	}

	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	txID := ctx.GetStub().GetTxID()

	asset.TransferTargetMSP = fslMSP
	asset.Status = "UNDER_FORENSIC_EXAMINATION"
	asset.UpdatedAt = timeString
	asset.LastTxID = txID

	updatedJSON, _ := json.Marshal(asset)
	_ = ctx.GetStub().PutState(evidenceID, updatedJSON)

	eventKey := fmt.Sprintf("EVENT_%s_%d", evidenceID, txTimestamp.Seconds)
	custodyEvent := CustodyEvent{
		DocType:      "CustodyEvent",
		EventID:      eventKey,
		EvidenceID:   evidenceID,
		EventType:    "FORENSIC_SUBMISSION",
		FromMSP:      clientMSP,
		ToMSP:        fslMSP,
		ActingMSP:    clientMSP,
		ActorID:      actorID,
		ActorRole:    actorRole,
		Notes:        notes,
		ResultStatus: "PENDING_EXAMINATION",
		Timestamp:    timeString,
		TxID:         txID,
	}
	eventJSON, _ := json.Marshal(custodyEvent)
	_ = ctx.GetStub().PutState(eventKey, eventJSON)
	_ = ctx.GetStub().SetEvent("ForensicSubmission", eventJSON)

	return nil
}

// RecordForensicVerification: FSL records their independent hash verification verdict
func (s *SmartContract) RecordForensicVerification(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	verifiedHash string,
	resultStatus string, // "MATCH" or "MISMATCH"
	actorID string,
	actorRole string,
	notes string,
) error {
	asset, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return err
	}

	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	txID := ctx.GetStub().GetTxID()

	if resultStatus == "MATCH" && verifiedHash == asset.SourceHash {
		asset.Status = "FORENSICALLY_VERIFIED"
	} else {
		asset.Status = "INTEGRITY_FLAGGED"
	}
	asset.OwnerMSP = clientMSP
	asset.TransferTargetMSP = ""
	asset.UpdatedAt = timeString
	asset.LastTxID = txID

	updatedJSON, _ := json.Marshal(asset)
	_ = ctx.GetStub().PutState(evidenceID, updatedJSON)

	eventKey := fmt.Sprintf("EVENT_%s_%d", evidenceID, txTimestamp.Seconds)
	custodyEvent := CustodyEvent{
		DocType:      "CustodyEvent",
		EventID:      eventKey,
		EvidenceID:   evidenceID,
		EventType:    "FORENSIC_VERIFICATION",
		FromMSP:      asset.OwnerMSP,
		ToMSP:        clientMSP,
		ActingMSP:    clientMSP,
		ActorID:      actorID,
		ActorRole:    actorRole,
		Notes:        notes,
		VerifiedHash: verifiedHash,
		ResultStatus: resultStatus,
		Timestamp:    timeString,
		TxID:         txID,
	}
	eventJSON, _ := json.Marshal(custodyEvent)
	_ = ctx.GetStub().PutState(eventKey, eventJSON)
	_ = ctx.GetStub().SetEvent("ForensicVerification", eventJSON)

	return nil
}

// FlagIntegrityBreach: Immediately flags evidence as compromised
func (s *SmartContract) FlagIntegrityBreach(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	detectedHash string,
	reason string,
	actorID string,
	actorRole string,
) error {
	asset, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return err
	}

	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	txID := ctx.GetStub().GetTxID()

	asset.Status = "INTEGRITY_FLAGGED"
	asset.UpdatedAt = timeString
	asset.LastTxID = txID

	updatedJSON, _ := json.Marshal(asset)
	_ = ctx.GetStub().PutState(evidenceID, updatedJSON)

	eventKey := fmt.Sprintf("EVENT_%s_%d", evidenceID, txTimestamp.Seconds)
	custodyEvent := CustodyEvent{
		DocType:      "CustodyEvent",
		EventID:      eventKey,
		EvidenceID:   evidenceID,
		EventType:    "INTEGRITY_BREACH",
		FromMSP:      asset.OwnerMSP,
		ToMSP:        asset.OwnerMSP,
		ActingMSP:    clientMSP,
		ActorID:      actorID,
		ActorRole:    actorRole,
		Notes:        fmt.Sprintf("ALERT: %s | Detected Hash: %s", reason, detectedHash),
		VerifiedHash: detectedHash,
		ResultStatus: "FLAGGED",
		Timestamp:    timeString,
		TxID:         txID,
	}
	eventJSON, _ := json.Marshal(custodyEvent)
	_ = ctx.GetStub().PutState(eventKey, eventJSON)
	_ = ctx.GetStub().SetEvent("IntegrityBreach", eventJSON)

	return nil
}

// SubmitToCourt: Submits verified evidence to the court repository with Section 63 Certificate
func (s *SmartContract) SubmitToCourt(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	courtMSP string,
	section63Ref string,
	actorID string,
	actorRole string,
	notes string,
) error {
	asset, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return err
	}

	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	txID := ctx.GetStub().GetTxID()

	asset.Status = "SUBMITTED_TO_COURT"
	asset.TransferTargetMSP = courtMSP
	asset.Section63Ref = section63Ref
	asset.UpdatedAt = timeString
	asset.LastTxID = txID

	updatedJSON, _ := json.Marshal(asset)
	_ = ctx.GetStub().PutState(evidenceID, updatedJSON)

	eventKey := fmt.Sprintf("EVENT_%s_%d", evidenceID, txTimestamp.Seconds)
	custodyEvent := CustodyEvent{
		DocType:      "CustodyEvent",
		EventID:      eventKey,
		EvidenceID:   evidenceID,
		EventType:    "COURT_SUBMISSION",
		FromMSP:      clientMSP,
		ToMSP:        courtMSP,
		ActingMSP:    clientMSP,
		ActorID:      actorID,
		ActorRole:    actorRole,
		Notes:        fmt.Sprintf("Section 63 Certificate %s attached. %s", section63Ref, notes),
		ResultStatus: "SUBMITTED",
		Timestamp:    timeString,
		TxID:         txID,
	}
	eventJSON, _ := json.Marshal(custodyEvent)
	_ = ctx.GetStub().PutState(eventKey, eventJSON)
	_ = ctx.GetStub().SetEvent("CourtSubmission", eventJSON)

	return nil
}

// ReadEvidence: Returns asset details and emits an audit read event
func (s *SmartContract) ReadEvidence(
	ctx contractapi.TransactionContextInterface,
	evidenceID string,
	actorID string,
	actorRole string,
) (*EvidenceAsset, error) {
	asset, err := s.readEvidenceInternal(ctx, evidenceID)
	if err != nil {
		return nil, err
	}

	clientMSP, _ := ctx.GetClientIdentity().GetMSPID()
	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	timeString := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)
	txID := ctx.GetStub().GetTxID()

	eventPayload := CustodyEvent{
		DocType:      "CustodyEvent",
		EventID:      fmt.Sprintf("EVENT_%s_%d", evidenceID, txTimestamp.Seconds),
		EvidenceID:   evidenceID,
		EventType:    "READ_AUDIT",
		FromMSP:      asset.OwnerMSP,
		ToMSP:        asset.OwnerMSP,
		ActingMSP:    clientMSP,
		ActorID:      actorID,
		ActorRole:    actorRole,
		Notes:        "Evidence record accessed",
		ResultStatus: "READ",
		Timestamp:    timeString,
		TxID:         txID,
	}
	eventJSON, _ := json.Marshal(eventPayload)
	_ = ctx.GetStub().SetEvent("EvidenceRead", eventJSON)

	return asset, nil
}

// GetEvidence: Fast direct read of the world state asset
func (s *SmartContract) GetEvidence(ctx contractapi.TransactionContextInterface, evidenceID string) (*EvidenceAsset, error) {
	return s.readEvidenceInternal(ctx, evidenceID)
}

// GetEvidenceEvents: Returns all append-only lifecycle events for a piece of evidence using prefix range scan
func (s *SmartContract) GetEvidenceEvents(ctx contractapi.TransactionContextInterface, evidenceID string) ([]*CustodyEvent, error) {
	startKey := fmt.Sprintf("EVENT_%s_", evidenceID)
	endKey := fmt.Sprintf("EVENT_%s_\uffff", evidenceID)

	resultsIterator, err := ctx.GetStub().GetStateByRange(startKey, endKey)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var events []*CustodyEvent
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var ev CustodyEvent
		if err = json.Unmarshal(queryResponse.Value, &ev); err != nil {
			return nil, err
		}
		events = append(events, &ev)
	}

	return events, nil
}

// GetEvidenceHistory: Returns the cryptographic delta history for the asset key
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

		var asset EvidenceAsset
		if !response.IsDelete {
			if errUnmarshal := json.Unmarshal(response.Value, &asset); errUnmarshal != nil {
				return nil, errUnmarshal
			}
		}

		timestamp := response.Timestamp.AsTime()
		record := HistoryResult{
			TxID:      response.TxId,
			Timestamp: timestamp,
			Record:    &asset,
			IsDelete:  response.IsDelete,
		}
		history = append(history, record)
	}

	return history, nil
}

// QueryByCaseID: Retrieves all evidence associated with a case ID
func (s *SmartContract) QueryByCaseID(ctx contractapi.TransactionContextInterface, caseID string) ([]*EvidenceAsset, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
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
		var asset EvidenceAsset
		if err = json.Unmarshal(queryResponse.Value, &asset); err != nil {
			continue
		}
		if asset.DocType == "EvidenceAsset" && asset.CaseID == caseID {
			assets = append(assets, &asset)
		}
	}

	return assets, nil
}

// EvidenceExists returns true if the evidence asset exists on world state
func (s *SmartContract) EvidenceExists(ctx contractapi.TransactionContextInterface, evidenceID string) (bool, error) {
	evidenceJSON, err := ctx.GetStub().GetState(evidenceID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return evidenceJSON != nil, nil
}

func (s *SmartContract) readEvidenceInternal(ctx contractapi.TransactionContextInterface, evidenceID string) (*EvidenceAsset, error) {
	evidenceJSON, err := ctx.GetStub().GetState(evidenceID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if evidenceJSON == nil {
		return nil, fmt.Errorf("evidence %s does not exist", evidenceID)
	}

	var asset EvidenceAsset
	if err = json.Unmarshal(evidenceJSON, &asset); err != nil {
		return nil, err
	}
	return &asset, nil
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
