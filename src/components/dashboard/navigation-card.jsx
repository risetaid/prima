'use client';
import { useRouter } from 'next/navigation';
export function NavigationCard({ title, icon, href, onClick }) {
    const router = useRouter();
    const handleClick = () => {
        if (onClick) {
            onClick();
        }
        else {
            router.push(href);
        }
    };
    return (<div onClick={handleClick} className="bg-blue-500 text-white rounded-xl p-4 text-center shadow-lg cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95">
      <div className="bg-white bg-opacity-20 rounded-lg p-3 mx-auto w-16 h-16 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>);
}
