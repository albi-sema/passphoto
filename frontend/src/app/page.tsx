"use client";

import React, { useState, useRef, useEffect } from "react";
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

  // New state variables for webcam usage
  const [useWebcam, setUseWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

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

  // Add a function to start the webcam
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      setErrorMsg("Unable to access webcam.");
    }
  };

  // When useWebcam changes, start or stop the video stream
  useEffect(() => {
    if (useWebcam) {
      startWebcam();
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
    // Cleanup on component unmount:
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [useWebcam]);

  // Add function to capture a photo from the webcam
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], "webcam-photo.jpg", { type: blob.type });
            setFile(capturedFile);
            setStatusMessage("Photo captured from webcam");
          }
        }, "image/jpeg");
      }
    }
  };

  // Add function to stop the webcam and switch back to upload mode
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setUseWebcam(false);
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-gray-100 text-black">
      {/* Toggle Buttons for Upload vs. Webcam */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => setUseWebcam(false)}
          className={`px-4 py-2 rounded ${useWebcam ? "bg-gray-300" : "bg-blue-500 text-white"}`}
        >
          Upload Photo
        </button>
        <button
          onClick={() => setUseWebcam(true)}
          className={`px-4 py-2 rounded ${useWebcam ? "bg-blue-500 text-white" : "bg-gray-300"}`}
        >
          Use Webcam
        </button>
      </div>

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
        {useWebcam ? (
          <div className="mb-4">
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-md border rounded" />
            <div className="mt-2 flex gap-4">
              <button
                onClick={capturePhoto}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Capture Photo
              </button>
              <button
                onClick={stopWebcam}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Stop Webcam
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
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
