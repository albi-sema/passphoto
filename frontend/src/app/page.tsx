"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Head from "next/head";

export default function Home() {
  const [viewMode, setViewMode] = useState<"upload" | "results">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [kernelSize, setKernelSize] = useState(1);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState("");
  const [biometricPhotoUrl, setBiometricPhotoUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [photoFormat, setPhotoFormat] = useState("us");

  // Loading and message states:
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Webcam usage states
  const [useWebcam, setUseWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // New state for storing the captured webcam photo URL
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState("");

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

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
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
      formData.append("photoFormat", photoFormat);
      const response = await axios.post("http://127.0.0.1:5000/generate-biometric-photo", formData);
      const { originalUrl, photoUrl } = response.data;
      setOriginalPhotoUrl("http://127.0.0.1:5000" + originalUrl + `?t=${new Date().getTime()}`);
      setBiometricPhotoUrl("http://127.0.0.1:5000" + photoUrl + `?t=${new Date().getTime()}`);
      setStatusMessage("Processing completed successfully");
      // Switch to results view after a successful request.
      setViewMode("results");
    } catch (error: any) {
      console.error(error);
      if (error.response && error.response.data && error.response.data.error) {
        if (error.response.data.error.toLowerCase().includes("face")) {
          setErrorMsg("No face detected. Please retake the photo with your face clearly visible.");
        } else {
          setErrorMsg(error.response.data.error);
        }
      } else {
        setErrorMsg("Error processing image. Please try again.");
      }
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
            // Create an object URL to immediately display the captured image
            setCapturedPhotoUrl(URL.createObjectURL(capturedFile));
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
    <>
      <Head>
        <title>free pass photo</title>
      </Head>
      <div className="min-h-screen flex bg-white text-black">
        <div className="hidden md:flex w-1/6 items-center justify-center bg-gray-200"></div>
        <div className="flex-1 p-8 pb-20 gap-16 sm:p-20">
          {/* About Section */}
          <section className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome to Passphoto</h1>
            <p className="text-lg">
              Passphoto helps you transform a standard portrait photo into a biometric photo suitable for
              passports and official IDs. Upload a photo, adjust the mask size, and get a processed image
              that meets official guidelines – all in one click!
            </p>
          </section>
          <div className="my-8 flex justify-center">
            <img src="/sample.png" alt="Sample Processed Photo" className="max-w-md rounded shadow" />
          </div>

          {viewMode === "upload" && (
            <>
              {/* Toggle Buttons for Upload vs. Webcam */}
              <div className="mb-4 flex gap-4">
                <button
                  onClick={() => setUseWebcam(false)}
                  className={`px-4 py-2 rounded ${
                    useWebcam ? "bg-gray-300" : "bg-blue-500 text-white"
                  }`}
                >
                  Upload Photo
                </button>
                <button
                  onClick={() => setUseWebcam(true)}
                  className={`px-4 py-2 rounded ${
                    useWebcam ? "bg-blue-500 text-white" : "bg-gray-300"
                  }`}
                >
                  Use Webcam
                </button>
              </div>
              {useWebcam ? (
                <div className="mb-4 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full max-w-md border rounded"
                    />
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
                  {capturedPhotoUrl && (
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Captured Photo</h3>
                      <img
                        src={capturedPhotoUrl}
                        alt="Captured Photo"
                        className="w-full max-w-md border rounded"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
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
                </>
              )}
              <div className="mt-4 flex items-center gap-4">
                <label htmlFor="photoFormat">Photo Format:</label>
                <select
                  id="photoFormat"
                  value={photoFormat}
                  onChange={(e) => setPhotoFormat(e.target.value)}
                  className="p-1 border rounded"
                >
                  <option value="us">US Photo</option>
                  <option value="germany">Germany Visa</option>
                </select>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="bg-blue-500 text-white p-4 rounded hover:bg-blue-600"
                  disabled={loading}
                  onClick={handleSubmit}
                >
                  {loading ? "Processing..." : "Generate Biometric Photo"}
                </button>
              </div>
            </>
          )}

          {viewMode === "results" && (
            <div className="container mx-auto">
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
              <div className="mt-4 flex items-center gap-4">
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
              <div className="mt-4">
                <button
                  type="button"
                  className="bg-blue-500 text-white p-4 rounded hover:bg-blue-600"
                  disabled={loading}
                  onClick={handleSubmit}
                >
                  {loading ? "Processing..." : "Update Biometric Photo"}
                </button>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setViewMode("upload")}
                  className="bg-gray-500 text-white p-2 rounded"
                >
                  Back to Upload
                </button>
              </div>
            </div>
          )}

          {/* Display error or success messages */}
          {errorMsg && <p className="text-red-600 mt-4">{errorMsg}</p>}
          {statusMessage && <p className="text-green-600 mt-4">{statusMessage}</p>}
        </div>
        <div className="hidden md:flex w-1/6 items-center justify-center bg-gray-200"></div>
      </div>
    </>
  );
}
