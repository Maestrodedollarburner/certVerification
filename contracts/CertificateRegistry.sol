// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title CertificateRegistry
 * @dev Stores academic certificate hashes on the blockchain for immutable verification
 */
contract CertificateRegistry {
    enum CertificateStatus { Valid, Revoked, Tampered }

    struct Certificate {
        string certificateId;
        string studentId;
        string studentName;
        string institutionName;
        string degreeAwarded;
        string dateIssued;
        bytes32 certificateHash;
        uint256 timestamp;
        CertificateStatus status;
        address issuer;
        bool exists;
    }

    address public admin;
    mapping(address => bool) public authorizedIssuers;
    mapping(string => Certificate) private certificates;
    string[] public certificateIds;

    event CertificateIssued(
        string indexed certificateId,
        string studentId,
        bytes32 certificateHash,
        address indexed issuer,
        uint256 timestamp
    );

    event CertificateStatusUpdated(
        string indexed certificateId,
        CertificateStatus newStatus,
        uint256 timestamp
    );

    event IssuerAuthorized(address indexed issuer, bool authorized);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not an authorized issuer");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }

    function authorizeIssuer(address issuer, bool authorized) external onlyAdmin returns (bool) {
        authorizedIssuers[issuer] = authorized;
        emit IssuerAuthorized(issuer, authorized);
        return true;
    }

    function issueCertificate(
        string memory _certificateId,
        string memory _studentId,
        string memory _studentName,
        string memory _institutionName,
        string memory _degreeAwarded,
        string memory _dateIssued,
        bytes32 _certificateHash
    ) external onlyAuthorizedIssuer returns (bool) {
        require(bytes(_certificateId).length > 0, "Certificate ID required");
        require(!certificates[_certificateId].exists, "Certificate already exists");

        certificates[_certificateId] = Certificate({
            certificateId: _certificateId,
            studentId: _studentId,
            studentName: _studentName,
            institutionName: _institutionName,
            degreeAwarded: _degreeAwarded,
            dateIssued: _dateIssued,
            certificateHash: _certificateHash,
            timestamp: block.timestamp,
            status: CertificateStatus.Valid,
            issuer: msg.sender,
            exists: true
        });

        certificateIds.push(_certificateId);

        emit CertificateIssued(
            _certificateId,
            _studentId,
            _certificateHash,
            msg.sender,
            block.timestamp
        );

        return true;
    }

    function verifyCertificate(
        string memory _certificateId,
        bytes32 _certificateHash
    ) external view returns (bool isValid, CertificateStatus status) {
        Certificate memory cert = certificates[_certificateId];

        if (!cert.exists) {
            return (false, CertificateStatus.Valid);
        }

        if (cert.status == CertificateStatus.Revoked) {
            return (false, CertificateStatus.Revoked);
        }

        if (cert.certificateHash != _certificateHash) {
            return (false, CertificateStatus.Tampered);
        }

        return (true, cert.status);
    }

    function getCertificate(string memory _certificateId)
        external
        view
        returns (
            string memory certificateId,
            string memory studentId,
            string memory studentName,
            string memory institutionName,
            string memory degreeAwarded,
            string memory dateIssued,
            bytes32 certificateHash,
            uint256 timestamp,
            CertificateStatus status,
            address issuer
        )
    {
        Certificate memory cert = certificates[_certificateId];
        require(cert.exists, "Certificate not found");

        return (
            cert.certificateId,
            cert.studentId,
            cert.studentName,
            cert.institutionName,
            cert.degreeAwarded,
            cert.dateIssued,
            cert.certificateHash,
            cert.timestamp,
            cert.status,
            cert.issuer
        );
    }

    function updateCertificateStatus(
        string memory _certificateId,
        CertificateStatus _newStatus
    ) external returns (bool) {
        require(certificates[_certificateId].exists, "Certificate not found");
        require(
            msg.sender == admin || certificates[_certificateId].issuer == msg.sender,
            "Only admin or original issuer can update status"
        );
        certificates[_certificateId].status = _newStatus;

        emit CertificateStatusUpdated(_certificateId, _newStatus, block.timestamp);
        return true;
    }

    function certificateExists(string memory _certificateId) external view returns (bool) {
        return certificates[_certificateId].exists;
    }

    function getTotalCertificates() external view returns (uint256) {
        return certificateIds.length;
    }

    function getCertificateIdAt(uint256 index) external view returns (string memory) {
        require(index < certificateIds.length, "Index out of bounds");
        return certificateIds[index];
    }
}
