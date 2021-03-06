
import { GameState } from '../../core/game-state';

export const event = 'plugin:player:request:collectibles';
export const socket = (socket) => {

  const requestcollectibles = async() => {
    if(!socket.authToken) return;

    const { playerName } = socket.authToken;
    if(!playerName) return;

    const player = GameState.getInstance().getPlayer(playerName);
    if(!player) return;
    player._updateCollectibles();
  };

  socket.on(event, requestcollectibles);
};