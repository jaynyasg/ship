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

  it('renders as a workspace upload without a document context', async () => {
    uploadFileMock.mockResolvedValue({
      fileId: 'file-1',
      cdnUrl: '/api/files/file-1/serve',
      assistantIndexingStatus: 'indexed',
    });

    const { container } = render(<AssistantUpload />);
    expect(screen.getByRole('button', { name: 'Upload Doc' })).toBeInTheDocument();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Workspace notes'], 'workspace-notes.md', { type: 'text/markdown' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledWith(file, undefined, undefined, { documentId: undefined });
    });
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

  it('shows the upload error returned by the upload service', async () => {
    uploadFileMock.mockRejectedValue(new Error('Failed to upload file'));

    const { container } = render(<AssistantUpload />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['bad'], 'broken.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(await screen.findByText('Failed to upload file')).toBeInTheDocument();
  });
});
