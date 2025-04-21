import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';
import logger from "@/utils/logger.ts";

interface RectangleCropperProps {
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

// Function to create an image from a URL
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

const RectangleCropper: React.FC<RectangleCropperProps> = ({
     image,
     onCropComplete,
     onCancel,
     aspectRatio = 16/9
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

  // Create a portal element outside of any dialog or other container
  return (
    <div 
      className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center z-[9999] font-kanit"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">ปรับแต่งรูปภาพร้านอาหาร</h3>
          <button 
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-gray-100"
            type="button"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="relative w-full h-96 sm:h-[500px] bg-gray-100 rounded-lg mb-6">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            cropShape="rect"
            showGrid={true}
            objectFit="contain"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button 
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="p-2 rounded-full hover:bg-gray-100"
              title="ซูมออก"
              type="button"
            >
              <ZoomOut size={24} />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full sm:w-48 accent-blue-accent"
            />
            <button 
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-2 rounded-full hover:bg-gray-100"
              title="ซูมเข้า"
              type="button"
            >
              <ZoomIn size={24} />
            </button>
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <Move size={20} className="mr-2" /> ลากเพื่อปรับตำแหน่ง
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button 
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            type="button"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleCrop}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
            type="button"
          >
            <Check size={20} className="mr-2" /> ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
};

export default RectangleCropper;