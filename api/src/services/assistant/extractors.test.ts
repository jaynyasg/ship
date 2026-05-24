import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractTextFromFile, isSupportedAssistantFile } from './extractors.js';

const { getTextMock, destroyMock } = vi.hoisted(() => ({
  getTextMock: vi.fn(),
  destroyMock: vi.fn(),
}));

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParseMock() {
    return {
      getText: getTextMock,
      destroy: destroyMock,
    };
  }),
}));

describe('assistant file extractors', () => {
  beforeEach(() => {
    getTextMock.mockReset();
    destroyMock.mockReset();
  });

  it('supports PDF files and extracts text through pdf-parse', async () => {
    getTextMock.mockResolvedValue({ text: 'PDF launch notes mention blocked items.' });

    const result = await extractTextFromFile({
      buffer: Buffer.from('%PDF-1.4 test'),
      mimeType: 'application/pdf',
      filename: 'launch-notes.pdf',
    });

    expect(result).toEqual({
      supported: true,
      text: 'PDF launch notes mention blocked items.',
    });
    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it('advertises PDFs as supported assistant upload files', () => {
    expect(isSupportedAssistantFile('launch-notes.pdf', 'application/pdf')).toBe(true);
  });
});
