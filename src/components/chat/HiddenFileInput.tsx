interface HiddenFileInputProps {
  isDisabled: boolean;
  onUploadFiles: (files: File[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function HiddenFileInput({ isDisabled, onUploadFiles, fileInputRef }: HiddenFileInputProps) {
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,.tsv,.txt"
      multiple
      className="hidden"
      onChange={(e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length > 0) {
          onUploadFiles(files);
        }
        e.currentTarget.value = '';
      }}
      disabled={isDisabled}
    />
  );
}
