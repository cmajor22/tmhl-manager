import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout, RequireAuth } from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Leagues from './pages/Leagues.jsx';
import Seasons from './pages/Seasons.jsx';
import Teams from './pages/Teams.jsx';
import ManageTeam from './pages/ManageTeam.jsx';
import EditRosterPlayer from './pages/EditRosterPlayer.jsx';
import Players from './pages/Players.jsx';
import Games from './pages/Games.jsx';
import GameSelect from './pages/GameSelect.jsx';
import GameData from './pages/GameData.jsx';
import ContactForm from './pages/ContactForm.jsx';
import PlayerCards from './pages/PlayerCards.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Public print page (the PHP version had its login check disabled) */}
      <Route path="/player-cards/:division" element={<PlayerCards />} />

      <Route element={<RequireAuth />}>
        <Route path="/games/:gameId/contact-form" element={<ContactForm />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/seasons" element={<Seasons />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:teamId" element={<ManageTeam />} />
          <Route path="/roster/:rosterId/edit" element={<EditRosterPlayer />} />
          <Route path="/players" element={<Players />} />
          <Route path="/games" element={<Games />} />
          <Route path="/game-data" element={<GameSelect />} />
          <Route path="/game-data/:gameId" element={<GameData />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
