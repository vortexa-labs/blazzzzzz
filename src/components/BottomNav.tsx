import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Rocket, BarChart2, Repeat, Wallet } from 'lucide-react';

const navItems = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/launch', label: 'Launch Token', icon: Rocket },
  { to: '/portfolio', label: 'Portfolio', icon: BarChart2 },
  { to: '/swap', label: 'Swap', icon: Repeat },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
];

const BottomNav: React.FC = () => (
  <nav className="fixed bottom-0 left-0 w-full bg-[#0f0f0f] border-t border-gray-800 flex justify-between px-2 py-1 z-50">
    {navItems.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `flex flex-col items-center flex-1 py-1 transition-colors ${isActive ? 'text-[#FF3131]' : 'text-white'}`
        }
      >
        <Icon size={26} strokeWidth={2.2} />
        <span className="text-xs mt-0.5 font-medium">{label.split(' ')[0]}</span>
      </NavLink>
    ))}
  </nav>
);

export default BottomNav; 