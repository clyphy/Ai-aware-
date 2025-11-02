
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCcw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      // Handle error (e.g., show a message to the user)
      onClose();
    }
  }, [onClose]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'capture.png', { type: 'image/png' });
          onCapture(file);
        });
    }
  };

  return (
    <div className="codex-modal-overlay">
      <div className="codex-modal-content w-full max-w-3xl p-4 rounded-lg m-4">
        <div className="relative aspect-video bg-black rounded overflow-hidden border border-cyan-500/30">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex justify-center items-center mt-4 space-x-4">
          {capturedImage ? (
            <>
              <button onClick={handleRetake} className="holographic-button p-3 rounded-full flex items-center space-x-2">
                <RefreshCcw />
                <span>Retake</span>
              </button>
              <button onClick={handleConfirm} className="holographic-button bg-green-500/20 border-green-500/50 p-3 rounded-full flex items-center space-x-2">
                <Check />
                <span>Use Photo</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleCapture}
              className="holographic-button rounded-full w-20 h-20 flex items-center justify-center"
              aria-label="Take Photo"
            >
              <Camera size={40} />
            </button>
          )}
        </div>
        
        <button onClick={onClose} className="absolute top-2 right-2 text-cyan-300 hover:text-white" aria-label="Close Camera">
            <X />
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
