import React from 'react';
import { X, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableImageProps {
  id: string;
  url: string;
  onRemove: (id: string) => void;
}

// Individual Sortable Image Item
const SortableImage: React.FC<SortableImageProps> = ({ id, url, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative w-full h-32 ${isDragging ? 'shadow-xl' : ''}`}
    >
      <div className="rounded-lg border overflow-hidden w-full h-full">
        <img src={url} alt="Restaurant" className="w-full h-full object-cover" />
      </div>
      
      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-2 left-2 bg-white/80 rounded-full p-1 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={18} className="text-gray-700" />
        </div>
        
        <button 
          type="button" 
          onClick={() => onRemove(id)}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center opacity-70 hover:opacity-100"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

interface DraggableImageGalleryProps {
  images: string[];
  onImagesReordered: (newImages: string[]) => void;
  onImageRemove: (imageUrl: string) => void;
}

const DraggableImageGallery: React.FC<DraggableImageGalleryProps> = ({ 
  images, 
  onImagesReordered,
  onImageRemove
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id.toString());
      const newIndex = images.indexOf(over.id.toString());
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(images, oldIndex, newIndex);
        onImagesReordered(newOrder);
      }
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SortableContext items={images} strategy={rectSortingStrategy}>
            {images.map((imageUrl) => (
              <SortableImage 
                key={imageUrl}
                id={imageUrl} 
                url={imageUrl} 
                onRemove={onImageRemove} 
              />
            ))}
          </SortableContext>
        </div>
        
        <p className="text-sm text-gray-500">
          Drag images to reorder them. The first image will be displayed as the main image.
        </p>
      </div>
    </DndContext>
  );
};

export default DraggableImageGallery;