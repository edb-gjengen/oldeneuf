"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

interface ScannerProps {
  onScan: (decodedText: string) => void;
}

interface Camera {
  id: string;
  label: string;
}

export default function Scanner({ onScan }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("environment");
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [error, setError] = useState<string>("");
  const [highlightStyle, setHighlightStyle] = useState("default-style");
  const [showScanRegion, setShowScanRegion] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const showControls = false;

  const handleScanResult = (result: QrScanner.ScanResult) => {
    onScan(result.data);
    setError("");
  };

  const handleScanError = (error: string | Error) => {
    setError(error.toString());
  };

  const updateFlashAvailability = async () => {
    if (scannerRef.current) {
      const flashAvailable = await scannerRef.current.hasFlash();
      setHasFlash(flashAvailable);
    }
  };

  const initializeScanner = async () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QrScanner(videoRef.current, handleScanResult, {
        onDecodeError: handleScanError,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      });

      await scannerRef.current.start();
      setIsScanning(true);
      setHasStartedOnce(true);
      await updateFlashAvailability();

      // expects both light and dark QR codes
      scannerRef.current.setInversionMode("both");

      const availableCameras = await QrScanner.listCameras(true);
      setCameras(availableCameras);
    } catch (err) {
      setError(`Failed to initialize scanner: ${err}`);
    }
  };

  const startScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.start();
        setIsScanning(true);
        setHasStartedOnce(true);
      } catch (err) {
        setError(`Failed to start scanner: ${err}`);
      }
    } else {
      await initializeScanner();
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const toggleFlash = async () => {
    if (scannerRef.current && hasFlash) {
      try {
        await scannerRef.current.toggleFlash();
        setIsFlashOn(scannerRef.current.isFlashOn());
      } catch (err) {
        setError(`Failed to toggle flash: ${err}`);
      }
    }
  };

  const handleCameraChange = async (cameraId: string) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.setCamera(cameraId);
        setSelectedCamera(cameraId);
        await updateFlashAvailability();
      } catch (err) {
        setError(`Failed to change camera: ${err}`);
      }
    }
  };

  useEffect(() => {
    QrScanner.hasCamera().then(setHasCamera);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (scannerRef.current && scannerRef.current.$canvas) {
      scannerRef.current.$canvas.style.display = showScanRegion
        ? "block"
        : "none";
    }
  }, [showScanRegion]);

  const getVideoContainerClass = () => {
    // on mobile portrait, fill top 50% of screen, no margin top/left/right
    const baseClass = "relative w-full max-w-md mx-auto";
    return `${baseClass} video-container-responsive`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {hasCamera === false ? (
        <div className="p-4 text-center">
          <p className="text-red-600 text-lg">
            Denne nettsiden krever tilgang til et kamera.
          </p>
        </div>
      ) : (
        <>
          <div className={getVideoContainerClass()}>
            <video
              ref={videoRef}
              className="w-full h-auto rounded-lg border-2 border-gray-300 cursor-pointer"
              playsInline
              muted
              onClick={isScanning ? stopScanner : startScanner}
            />
          </div>

          <div className="p-2 space-y-2">
            <div className="text-center">
              {!hasStartedOnce && (
                <p className="text-white-600 mb-4">
                  Trykk på området over for å skru av og på kameraet.
                </p>
              )}

              {/* Controls */}
              {showControls && (
                <>
                  <div className="mt-0 space-y-2">
                    {/* Start/Stop Toggle Button */}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={isScanning ? stopScanner : startScanner}
                        className={`px-2 py-2 text-white rounded-lg transition-colors ${
                          isScanning
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-green-500 hover:bg-green-600"
                        }`}
                      >
                        {isScanning ? "Stopp" : "Start"}
                      </button>
                    </div>
                    {/* Flash Toggle */}
                    {hasFlash && (
                      <button
                        onClick={toggleFlash}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        📸 Flash: {isFlashOn ? "on" : "off"}
                      </button>
                    )}
                  </div>

                  <div>
                    {/* Settings */}
                    <div className="mt-2 space-y-2 text-left">
                      {/* Camera Selection */}
                      {cameras.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Camera:
                          </label>
                          <select
                            value={selectedCamera}
                            onChange={(e) => handleCameraChange(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="environment">
                              Environment Facing (Back Camera)
                            </option>
                            <option value="user">User Facing (Front Camera)</option>
                            {cameras.map((camera) => (
                              <option key={camera.id} value={camera.id}>
                                {camera.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Highlight Style */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Highlight Style:
                        </label>
                        <select
                          value={highlightStyle}
                          onChange={(e) => setHighlightStyle(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="default-style">Default style</option>
                          <option value="example-style-1">Custom style 1</option>
                          <option value="example-style-2">Custom style 2</option>
                        </select>
                      </div>

                      {/* Show Scan Region */}
                      <div className="flex items-center">
                        <input
                          id="show-scan-region"
                          type="checkbox"
                          checked={showScanRegion}
                          onChange={(e) => setShowScanRegion(e.target.checked)}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor="show-scan-region"
                          className="text-sm font-medium text-gray-700"
                        >
                          Show scan region canvas
                        </label>
                      </div>
                    </div>

                    {/* Status Information */}
                    <div className="mt-6 space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Device has camera:</span>{" "}
                        {hasCamera !== null
                          ? hasCamera
                            ? "Yes"
                            : "No"
                          : "Checking..."}
                      </div>
                      <div>
                        <span className="font-medium">Camera has flash:</span>{" "}
                        {hasFlash ? "Yes" : "No"}
                      </div>
                      {error && (
                        <div className="text-red-600 font-medium">
                          <span className="font-medium">Error:</span> {error}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        /* Responsive video container for mobile portrait */
        @media (max-width: 768px) and (orientation: portrait) {
          .video-container-responsive {
            width: 100vw !important;
            max-width: 100vw !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            margin-top: 0 !important;
            height: 55dvh !important;
            background: #000;
            border-radius: 0 !important;
            display: flex;
            align-items: stretch;
            justify-content: stretch;
          }
          .video-container-responsive video {
            width: 100vw !important;
            height: 55dvh !important;
            object-fit: cover;
            border-radius: 0 !important;
            border: none !important;
            display: block;
          }
        }

        :global(.scanner-style-1 .scan-region-highlight-svg),
        :global(.scanner-style-1 .code-outline-highlight) {
          stroke: #64a2f3 !important;
        }

        :global(.scanner-style-2 .scan-region-highlight) {
          border-radius: 30px;
          outline: rgba(0, 0, 0, 0.25) solid 50vmax;
        }

        :global(.scanner-style-2 .scan-region-highlight-svg) {
          display: none;
        }

        :global(.scanner-style-2 .code-outline-highlight) {
          stroke: rgba(255, 255, 255, 0.5) !important;
          stroke-width: 15 !important;
          stroke-dasharray: none !important;
        }
      `}</style>
    </div>
  );
}
