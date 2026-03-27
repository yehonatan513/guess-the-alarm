import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: "🏠", label: "בית" },
  { path: "/build", icon: "🎰", label: "הימר" },
  { path: "/my-bets", icon: "📋", label: "ההימורים שלי" },
  { path: "/profile", icon: "👤", label: "פרופיל" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
