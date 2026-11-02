import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/bricolage-grotesque';
import './globals.css';
import './theme.css';
import EduTrack from './EduTrack';
createRoot(document.getElementById('root')!).render(<EduTrack />);
