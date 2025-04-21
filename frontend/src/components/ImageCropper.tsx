import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';
import logger from "@/utils/logger.ts";

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

// Define types for cropped area
interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Interface for crop completion data from react-easy-crop
interface CropCompleteResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Function to create an image from a canvas
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

// Function to get the cropped canvas
async function getCroppedImg(
    imageSrc: string,
    pixelCrop: CroppedAreaPixels
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  // Set the canvas dimensions to the cropped size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image onto the canvas
  ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
  );

  // Convert canvas to base64 string
  return canvas.toDataURL('image/jpeg', 0.9);
}

const ImageCropper: React.FC<ImageCropperProps> = ({
     image,
     onCropComplete,
     onCancel,
     aspectRatio = 1
   }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);

  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropCompleteCallback = useCallback(
      (_: CropCompleteResult, croppedAreaPixels: CroppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
      },
      []
  );

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImageUrl = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImageUrl);
    } catch (e) {
      logger.error('Error creating cropped image:', e);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 font-kanit">
      <div className="bg-white rounded-lg max-w-lg w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">ปรับแต่งรูปโปรไฟล์</h3>
          <button 
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="relative w-full h-64 sm:h-80 bg-gray-100 rounded-lg mb-4">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            cropShape="round"
            showGrid={false}
            classes={{
              containerClassName: "cropper-container",
              cropAreaClassName: "cropper-crop-area"
            }}
          />
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="p-2 rounded-full hover:bg-gray-100"
              title="ซูมออก"
            >
              <ZoomOut size={20} />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-32 accent-blue-accent"
            />
            <button 
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-2 rounded-full hover:bg-gray-100"
              title="ซูมเข้า"
            >
              <ZoomIn size={20} />
            </button>
          </div>
          
          <div className="flex items-center text-xs text-gray-500">
            <Move size={16} className="mr-1" /> ลากเพื่อปรับตำแหน่ง
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button 
            onClick={onCancel}
            className="btn btn-outline border-gray-300"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleCrop}
            className="btn bg-blue-accent hover:bg-blue-accent-200 text-white"
          >
            <Check size={18} className="mr-1" /> ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;