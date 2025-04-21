import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, 
  ImagePlus, 
  PenSquare, 
  Trash2,
  GripVertical
} from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Banner, bannerService } from '@/services/bannerService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import RectangleCropper from '@/components/RectangleCropper';
import logger from "@/utils/logger.ts";

interface SortableBannerProps {
  banner: Banner;
  onToggleActive: (_id: string, isActive: boolean) => void;
  onEdit: (banner: Banner) => void;
  onDelete: (_id: string) => void;
  formatDate: (dateString?: string) => string;
}

const SortableBanner = ({ banner, onToggleActive, onEdit, onDelete, formatDate }: SortableBannerProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: banner._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:shadow-md transition-shadow duration-200"
    >
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab touch-none self-center md:self-auto mr-0 md:mr-3 flex justify-center mb-2 md:mb-0"
      >
        <GripVertical className="h-6 w-6 text-gray-400" />
      </div>
      
      <div className="h-28 w-full md:h-24 md:w-28 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden">
        <img 
          src={banner.image_url} 
          alt={`Banner ${banner._id}`} 
          className="h-full w-full object-cover"
        />
      </div>
      
      <div className="w-full md:w-auto flex-1 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-sm text-gray-500 truncate max-w-[200px]">
            ID: <span className="font-mono text-xs">{banner._id.substring(0, 10)}...</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              checked={banner.is_active} 
              onCheckedChange={(checked) => onToggleActive(banner._id, checked)}
              className="data-[state=checked]:bg-green-500"
            />
            <span className={`text-sm ${banner.is_active ? 'text-green-500 font-medium' : 'text-gray-500'}`}>
              {banner.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-medium text-gray-500">Display Order</h3>
            <p className="font-semibold">{banner.display_order + 1}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500">Last Updated</h3>
            <p className="text-xs sm:text-sm">{formatDate(banner.updated_at)}</p>
          </div>
        </div>
      </div>
      
      <div className="w-full md:w-auto flex flex-row md:flex-col justify-end gap-2 mt-4 md:mt-0 md:ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(banner)}
          className="text-blue-accent hover:text-blue-accent-200 flex-1 md:flex-auto md:w-20"
        >
          <div className="flex items-center justify-center">
            <PenSquare className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </div>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(banner._id)}
          className="text-red-600 hover:text-red-700 flex-1 md:flex-auto md:w-20"
        >
          <div className="flex items-center justify-center">
            <Trash2 className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </div>
        </Button>
    </div>
    </div>
  );
};

const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [displayOrder, setDisplayOrder] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const data = await bannerService.getAllBanners();
      
      // Sort banners by display order
      const sortedBanners = data.sort((a, b) => a.display_order - b.display_order);
      setBanners(sortedBanners);
      
      // Set next display order for new banners
      if (sortedBanners.length > 0) {
        const maxOrder = Math.max(...sortedBanners.map(b => b.display_order));
        setDisplayOrder(maxOrder + 1);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch banners');
      logger.error('Fail to fetch banners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBanner = () => {
    setCurrentBanner(null);
    setIsAddDialogOpen(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setCurrentBanner(banner);
    setIsAddDialogOpen(true);
  };

  const handleDeleteBanner = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await bannerService.deleteBanner(id);
        toast.success('Banner deleted successfully');
        fetchBanners();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete banner');
      }
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await bannerService.toggleBannerStatus(id, isActive);
      
      // Update local state for immediate UI feedback
      setBanners(prev => prev.map(banner => 
        banner._id === id ? { ...banner, is_active: isActive } : banner
      ));
      
      toast.success(`Banner ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update banner status');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex(banner => banner._id === active.id);
    const newIndex = banners.findIndex(banner => banner._id === over.id);

    const newBanners = arrayMove(banners, oldIndex, newIndex);
    setBanners(newBanners);

    const updatedBannerOrders = newBanners.map((banner, index) => ({
      _id: banner._id,
      display_order: index,
    }));

    try {
      await bannerService.updateBannerOrder(updatedBannerOrders);
      toast.success('Banner order updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update banner order');
      fetchBanners(); // revert
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size is too large (max 20MB)');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }

      setOriginalFile(file);
      const imageUrl = URL.createObjectURL(file);
      setCropperImage(imageUrl);
      setIsAddDialogOpen(false);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      
      // Convert data URL to blob for upload
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();

      // Create a File object from the blob
      const file = new File([blob], originalFile?.name || 'banner-image.jpg', {
        type: 'image/jpeg'
      });

      if (currentBanner) {
        // Update existing banner
        const imageUrl = await bannerService.uploadBannerImage(file);
        await bannerService.updateBanner(currentBanner._id, { 
          image_url: imageUrl,
          is_active: currentBanner.is_active,
          display_order: currentBanner.display_order
        });
        toast.success('Banner updated successfully');
      } else {
        // Create new banner
        await bannerService.createBanner({
          is_active: true,
          display_order: displayOrder
        }, file);
        toast.success('Banner added successfully');
      }
      
      // Cleanup and refresh
      fetchBanners();
      setCropperImage(null);
      setOriginalFile(null);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process banner');
    }
  };

  const handleCropCancel = () => {
    setCropperImage(null);
    setOriginalFile(null);
    setIsAddDialogOpen(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return format(date, 'PPP p'); // Format: May 25, 2020, 6:30 PM
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-blue-accent">จัดการแบนเนอร์</h2>
      
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h3 className="text-lg sm:text-xl font-medium">Banners</h3>
          <Button
            onClick={handleAddBanner}
            className="bg-blue-accent hover:bg-blue-accent-200 w-full sm:w-auto"
            disabled={banners.length >= 4}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Banner
          </Button>
        </div>
        
        {banners.length >= 4 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-md">
            <p className="text-sm">Maximum of 4 banners reached. Delete an existing banner to add a new one.</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-accent border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
            <p className="mt-2 text-gray-600">Loading banners...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            <p className="font-medium">Error: {error}</p>
            <Button onClick={fetchBanners} variant="outline" className="mt-2 text-sm" size="sm">
              Try Again
            </Button>
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No banners found.</p>
            <Button
              onClick={handleAddBanner}
              className="bg-blue-accent hover:bg-blue-accent-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Banner
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-sm text-blue-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Drag and drop banners to reorder them. Only the first {banners.filter(b => b.is_active).length}/4 active banners will be shown on the homepage.
              </p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={banners.map(banner => String(banner._id))}
                strategy={verticalListSortingStrategy}
              >
                {banners.map((banner) => (
                  <SortableBanner
                    key={banner._id}
                    banner={banner}
                    onToggleActive={handleToggleActive}
                    onEdit={handleEditBanner}
                    onDelete={handleDeleteBanner}
                    formatDate={formatDate}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-5">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-semibold">
              {currentBanner ? 'Edit Banner' : 'Add New Banner'}
            </DialogTitle>
            <DialogDescription>
              {currentBanner
                  ? 'Update the existing banner image'
                  : 'Upload a new banner image to display on the homepage'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Banner Image</h3>
              <p className="text-sm text-gray-500">
                Upload an image for the banner. Recommended size: 1200×400 pixels (3:1 ratio).
              </p>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleImageClick}
                className="w-full h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-accent rounded-lg transition-colors duration-200"
              >
                <ImagePlus className="h-8 w-8 mb-2 text-gray-400" />
                <span className="text-gray-600 font-medium">Click to upload image</span>
                <span className="text-xs text-gray-400 mt-1">(Max size: 20MB)</span>
              </Button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            {currentBanner && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Current Image</h3>
                <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                  <img
                    src={currentBanner.image_url}
                    alt="Current banner"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImageClick}
              className="bg-blue-accent hover:bg-blue-accent-200 w-full sm:w-auto"
            >
              {currentBanner ? 'Update Image' : 'Upload Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cropperImage && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <RectangleCropper
            image={cropperImage}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
            aspectRatio={3/1}  // 1200×400 aspect ratio
          />
        </div>
      )}
    </div>
  );
};

export default AdminBanners;