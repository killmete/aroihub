import React, { useRef, useEffect } from 'react';
import LoadingBarLib from 'react-top-loading-bar';
import { useLoading } from '../context/LoadingContext';

const LoadingBar: React.FC = () => {
    const { isLoading, progress } = useLoading();
    const ref = useRef<any>(null);

    // Effect to handle loading state changes
    useEffect(() => {
        if (isLoading) {
            // Start the loading bar only if it's not already running
            ref.current?.continuousStart();
        }
    }, [isLoading]);

    // Separate effect to handle progress changes
    useEffect(() => {
        if (progress === 100) {
            // Ensure loading bar completes when progress is 100
            ref.current?.complete();
        } else if (progress > 0) {
            // Update loading bar progress for values between 0-99
            ref.current?.staticStart(progress);
        }
    }, [progress]);

    return (
        <LoadingBarLib
            ref={ref}
            color="#4B7BE5" // Blue accent color
            height={3}
            shadow={true}
            className="z-[9999]" // Ensure it's always on top
            waitingTime={300} // Adjust waiting time for smoother animation
            transitionTime={300} // Add transition time for smoother completion
        />
    );
};

export default LoadingBar;