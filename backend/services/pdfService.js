const PDFDocument = require('pdfkit');

function qrDataUrlToBuffer(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const base64 = dataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
}

function generateCertificatePDF(cert) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    doc.rect(30, 30, pageWidth - 60, doc.page.height - 60).stroke('#1a365d');
    doc.rect(40, 40, pageWidth - 80, doc.page.height - 80).stroke('#c9a227');

    doc.fontSize(14).fillColor('#1a365d').text(cert.institutionName, 0, 80, { align: 'center' });

    doc.moveDown(1);
    doc.fontSize(32).fillColor('#1a365d').text('Certificate of Achievement', { align: 'center' });

    doc.moveDown(1.5);
    doc.fontSize(14).fillColor('#4a5568').text('This is to certify that', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(28).fillColor('#1a365d').text(cert.studentName, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#4a5568').text('has successfully completed the requirements for', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(22).fillColor('#1a365d').text(cert.degreeAwarded, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(13).fillColor('#4a5568').text(
      `${cert.programme} | ${cert.department} | Class of ${cert.graduationYear}`,
      { align: 'center' }
    );

    const qrBuffer = qrDataUrlToBuffer(cert.qrCode);
    if (qrBuffer) {
      doc.image(qrBuffer, pageWidth - 150, 90, { width: 90, height: 90 });
      doc.fontSize(8).fillColor('#718096').text('Scan to verify', pageWidth - 150, 185, { width: 90, align: 'center' });
    }

    doc.moveDown(2);
    doc.fontSize(11).fillColor('#718096');
    doc.text(`Certificate ID: ${cert.certificateId}`, 80, doc.page.height - 120);
    doc.text(`Issue Date: ${new Date(cert.issueDate).toLocaleDateString()}`, 80, doc.page.height - 100);
    doc.text(`Student ID: ${cert.studentId}`, 80, doc.page.height - 80);

    doc.fontSize(9).fillColor('#a0aec0');
    doc.text(`Blockchain Hash: ${cert.certificateHash}`, 80, doc.page.height - 55, {
      width: pageWidth - 200,
    });

    if (cert.verificationUrl) {
      doc.fontSize(8).fillColor('#a0aec0').text(cert.verificationUrl, 80, doc.page.height - 40, {
        width: pageWidth - 200,
      });
    }

    doc.fontSize(10).fillColor('#1a365d');
    doc.text('_________________________', centerX - 100, doc.page.height - 130, { width: 200, align: 'center' });
    doc.text('Authorized Signatory', centerX - 100, doc.page.height - 115, { width: 200, align: 'center' });

    doc.end();
  });
}

module.exports = { generateCertificatePDF };
