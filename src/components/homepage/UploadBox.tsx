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
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 border border-gray-700 rounded-lg mb-8 flex items-center space-x-4 shadow-lg">
      {/* Upload button with hidden input */}
      <label className="cursor-pointer text-blue-400 text-2xl hover:text-blue-300 transition-colors">
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
        <p className="font-semibold text-white font-karla">Upload your notes to get started</p>
        <p className="text-sm text-gray-400 font-ibm-plex">
          We'll instantly generate questions based on your image
        </p>
        <p className="text-xs text-gray-500 mt-1 font-ibm-plex">
          Supported formats: JPEG, PNG, GIF, WebP
        </p>
      </div>
    </div>
  );
}

