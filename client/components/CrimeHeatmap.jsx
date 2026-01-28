import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import MapView, { Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import { getCrimePoints } from '../services/CrimeDatabase';

const CrimeHeatmap = ({ region }) => {
    const [points, setPoints] = useState([]);

    useEffect(() => {
        if (region) {
            loadPoints();
        }
    }, [region]);

    const loadPoints = async () => {
        const data = await getCrimePoints(region);
        // Heatmap expects [{ latitude, longitude, weight }]
        setPoints(data);
    };

    if (!points.length) return null;

    return (
        <Heatmap
            points={points}
            opacity={0.7}
            radius={30}
            gradient={{
                colors: ['#00ff00', '#ffff00', '#ff0000'],
                startPoints: [0.2, 0.5, 0.8],
                colorMapSize: 256,
            }}
        />
    );
};

export default CrimeHeatmap;
