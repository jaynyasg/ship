import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadFile } from '@/services/upload';
import { AssistantUpload } from './AssistantUpload';

vi.mock('@/services/upload', () => ({
  uploadFile: vi.fn(),
}));

const uploadFileMock = vi.mocked(uploadFile);

describe('AssistantUpload', () => {
  afterEach(() => {
    uploadFileMock.mockReset();
  });

  it('does not render without a document context', () => {
    const { container } = render(<AssistantUpload />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uploads files with the current document context', async () => {
    uploadFileMock.mockResolvedValue({
      fileId: 'file-1',
      cdnUrl: '/api/files/file-1/serve',
      assistantIndexingStatus: 'indexed',
    });

    const documentId = '51d52f48-100d-4f1b-8c7d-1da98d2ab0c0';
    const { container } = render(<AssistantUpload documentId={documentId} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Launch notes'], 'launch-notes.md', { type: 'text/markdown' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledWith(file, undefined, undefined, { documentId });
    });
    expect(await screen.findByText('Indexed')).toBeInTheDocument();
  });
});
