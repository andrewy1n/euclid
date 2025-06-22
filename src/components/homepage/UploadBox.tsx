import React from "react";

interface UploadBoxProps {
  onFileUpload: (file: File) => void;
}

export default function UploadBox({ onFileUpload }: UploadBoxProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name);
      onFileUpload(file);
    }
  };

  return (
    <div className="bg-indigo-50 p-4 border border-indigo-200 rounded-lg mb-8 flex items-center space-x-4 shadow-sm">
      {/* Upload button with hidden input */}
      <label className="cursor-pointer text-indigo-600 text-2xl">
        ⬆️
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* Description text */}
      <div>
        <p className="font-semibold text-indigo-800">Upload your notes to get started</p>
        <p className="text-sm text-gray-600">
          We'll instantly generate questions based on your image
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supported formats: JPEG, PNG, GIF, WebP
        </p>
      </div>
    </div>
  );
}

