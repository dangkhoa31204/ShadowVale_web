import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { Icon } from '../shared/ui';
export function AccountMenu() {
  const { user, logout } = useAuth();
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" aria-label="Account"><Icon name="account_circle" /><span className="sv-account-name">{user?.callsign}</span><Icon name="expand_more" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuLabel className="grid"><strong className="font-medium text-foreground">{user?.callsign}</strong><small className="text-xs font-normal [overflow-wrap:anywhere]">{user?.email}</small></DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild><Link to="/admin/change-password"><Icon name="lock_reset" />Change password</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/admin/analytics"><Icon name="monitoring" />Analytics</Link></DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => { void logout().catch(() => {}); }}><Icon name="logout" />Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
