import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PlayerView } from './screens/PlayerView.js';
import {
  SLICE_SHEET, SLICE_IDENTITY, SLICE_MY_CREATURE_ID, SLICE_ROOM, SLICE_SCENE, SLICE_PARTY,
} from './screens/sliceConfig.js';
import '@questra/theme/styles.css';
import './theme/index.css';

/**
 * The M2 slice screen. Connection params come from the URL so you can point it at a
 * running server with a real token:
 *
 *   http://localhost:5173/?server=ws://localhost:8787&session=<playSessionId>&token=<accessToken>
 *
 * Defaults target the dev server on :8787. `token`/`session` must match a real
 * account seated in that session (see the dev-env README / auth flow).
 */
const params = new URLSearchParams(window.location.search);
const url = params.get('server') ?? 'ws://localhost:8787';
const playSessionId = params.get('session') ?? 'sess_slice';
const token = params.get('token') ?? '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlayerView
      url={url}
      playSessionId={playSessionId}
      token={token}
      myCreatureId={SLICE_MY_CREATURE_ID}
      sheet={SLICE_SHEET}
      identity={SLICE_IDENTITY}
      room={SLICE_ROOM}
      scene={SLICE_SCENE}
      party={SLICE_PARTY}
    />
  </StrictMode>,
);
