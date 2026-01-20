import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export class PDFService {
    constructor(config) {
        this.outputDir = config.pdf_output_dir;
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    generatePdfStream(content, companyName) {
        return new Promise((resolve, reject) => {
            try {
                const sanitizedName = companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filename = `${sanitizedName}_report.pdf`;

                const doc = new PDFDocument();
                const buffers = [];

                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve({ buffer: pdfData, filename });
                });

                doc.fontSize(25).text(companyName, { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).text(content, {
                    align: 'left'
                });

                doc.end();

            } catch (e) {
                reject(e);
            }
        });
    }
}
