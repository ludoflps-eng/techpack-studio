import { useStore } from './store';
import { Home } from './components/Home';
import { Editor } from './components/Editor';

export default function App() {
  const { packs, activeId } = useStore();
  const activePack = packs.find((p) => p.id === activeId);

  if (activePack) return <Editor pack={activePack} />;
  return <Home />;
}
