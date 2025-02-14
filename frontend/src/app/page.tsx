"use client";

import React, { useState } from "react";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [kernelSize, setKernelSize] = useState(1);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState("");
  const [biometricPhotoUrl, setBiometricPhotoUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // New state variables for loading and messages:
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Please select an image file");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setStatusMessage("");
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("kernelSize", kernelSize.toString());
      const response = await axios.post("http://127.0.0.1:5000/generate-biometric-photo", formData);
      const { originalUrl, photoUrl } = response.data;
      setOriginalPhotoUrl("http://127.0.0.1:5000" + originalUrl + `?t=${new Date().getTime()}`);
      setBiometricPhotoUrl("http://127.0.0.1:5000" + photoUrl + `?t=${new Date().getTime()}`);
      setStatusMessage("Processing completed successfully");
    } catch (error) {
      console.error(error);
      setErrorMsg("Error processing image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to download an image by triggering a link click
  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-gray-100 text-black">
      {/* About Section */}
      <section className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Passphoto</h1>
        <p className="text-lg">
          Passphoto helps you transform a standard portrait photo into a biometric photo suitable for
          passports and official IDs. Upload a photo, adjust the mask size, and get a processed image
          that meets official guidelines – all in one click!
        </p>
      </section>

      <div className="container mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-4 border-dashed p-8 text-center cursor-pointer ${
              dragOver ? "bg-blue-100" : "bg-white"
            }`}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            {file ? (
              <p>{file.name}</p>
            ) : (
              <p>Drag and drop an image here or click to browse</p>
            )}
          </div>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-4">
            <label htmlFor="kernelSize">Mask Size:</label>
            <input
              id="kernelSize"
              type="range"
              min="1"
              max="10"
              value={kernelSize}
              onChange={(e) => setKernelSize(parseInt(e.target.value))}
            />
            <span>{kernelSize}</span>
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white p-4 rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Processing..." : "Generate Biometric Photo"}
          </button>
        </form>
        {/* Display error or success messages */}
        {errorMsg && <p className="text-red-600 mt-4">{errorMsg}</p>}
        {statusMessage && <p className="text-green-600 mt-4">{statusMessage}</p>}
        {(originalPhotoUrl || biometricPhotoUrl) && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-center mb-4">Results</h2>
            <div className="flex flex-col md:flex-row gap-8 justify-center">
              {originalPhotoUrl && (
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Original Photo</h3>
                  <img
                    src={originalPhotoUrl}
                    alt="Original Photo"
                    className="max-w-full border rounded-lg shadow"
                  />
                  <button
                    className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    onClick={() =>
                      downloadImage(originalPhotoUrl, "original_photo.jpg")
                    }
                  >
                    Download Original
                  </button>
                </div>
              )}
              {biometricPhotoUrl && (
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Biometric Photo</h3>
                  <img
                    src={biometricPhotoUrl}
                    alt="Biometric Photo"
                    className="max-w-full border rounded-lg shadow"
                  />
                  <button
                    className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    onClick={() =>
                      downloadImage(biometricPhotoUrl, "biometric_photo.jpg")
                    }
                  >
                    Download Biometric
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
