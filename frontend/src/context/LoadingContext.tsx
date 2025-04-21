import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';

interface LoadingContextType {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    progress: number;
    setProgress: (progress: number) => void;
    startLoading: () => void;
    completeLoading: () => void;
    incrementProgress: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Function to clear any existing timer
    const clearProgressTimer = () => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
    };

    const startLoading = () => {
        // Clear any existing timer first
        clearProgressTimer();
        
        setIsLoading(true);
        setProgress(0);
        
        // Create a new timer that will increase progress gradually
        progressTimerRef.current = setInterval(() => {
            setProgress(prev => {
                // Gradually slow down progress as it gets closer to 90%
                if (prev < 30) return prev + 5;
                if (prev < 60) return prev + 3;
                if (prev < 80) return prev + 1;
                if (prev < 90) return prev + 0.5;
                // Stop at 90% and wait for completeLoading to be called
                return 90;
            });
        }, 150);
    };
    
    const incrementProgress = () => {
        setProgress(prev => Math.min(prev + 10, 90));
    };
    
    const completeLoading = () => {
        // Clear the progress timer first
        clearProgressTimer();
        
        // Set progress to 100 to complete the loading bar
        setProgress(100);
        
        // After a small delay, reset the loading state
        setTimeout(() => {
            setIsLoading(false);
            setProgress(0);
        }, 400);
    };
    
    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            clearProgressTimer();
        };
    }, []);

    return (
        <LoadingContext.Provider 
            value={{ 
                isLoading, 
                setIsLoading, 
                progress, 
                setProgress, 
                startLoading, 
                completeLoading,
                incrementProgress
            }}
        >
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};