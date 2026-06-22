
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useOrganizations } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Organization } from '@/lib/types';
import { Building, Plus, Pencil, Trash2, Mail, Info } from 'lucide-react';

const OrganizationList = () => {
  const { organizations, loading, deleteOrganization, updateOrganization } = useOrganizations();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editingOrgName, setEditingOrgName] = useState('');
  const router = useRouter();

  // Filter organizations based on search query
  const filteredOrganizations = organizations.filter(organization =>
    organization.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteOrganization = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this organization?')) {
      try {
        await deleteOrganization(id);
      } catch (error) {
        console.error('Failed to delete organization:', error);
      }
    }
  };

  const handleUpdateName = async (id: string) => {
    if (editingOrgName.trim() === '') {
      setEditingOrgId(null);
      return;
    }
    try {
      await updateOrganization(id, { name: editingOrgName.trim() });
      setEditingOrgId(null);
    } catch (error) {
      console.error('Failed to update organization:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleUpdateName(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditingOrgId(null);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const { allowUserOrgCreation } = useOrganizations();
  const canCreate = isSuperAdmin || allowUserOrgCreation;

  const isManagerOf = (organization: Organization) => currentUser?.id && organization.managerIds.includes(currentUser.id);

  const canManage = (organization: Organization) => {
    if (!currentUser) return false;
    return isSuperAdmin || isManagerOf(organization);
  };

  const hasAnyActions = isSuperAdmin || filteredOrganizations.some(o => canManage(o));

  return (
    <div className="container mx-auto px-0 sm:px-4 py-8">
      <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Building className="h-5 w-5 sm:h-6 sm:w-6" />
            Organizations
          </CardTitle>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <Input
              placeholder="Search organizations..."
              className="w-full sm:max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {canCreate ? (
              <Button onClick={() => router.push('/organizations/new')} className="w-full sm:w-auto gap-2">
                <Plus className="h-4 w-4" />
                Create Organization
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                onClick={() => window.open('mailto:gamitarkin2@gmail.com', '_blank')}
              >
                <Mail className="h-4 w-4" />
                Contact Admin to Create
              </Button>
            )}
          </div>
        </CardHeader>
        
        {!canCreate && !isSuperAdmin && (
          <div className="px-6 pb-2">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10 border-dashed">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Public Creation Disabled</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Direct organization creation is restricted. Please email the administrator 
                  to set up your church or group.
                </p>
                <a 
                  href="mailto:gamitarkin2@gmail.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-block pt-1 text-xs font-bold text-primary hover:underline"
                >
                  gamitarkin2@gmail.com →
                </a>
              </div>
            </div>
          </div>
        )}
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {loading ? (
            <div className="text-center py-12">Loading organizations...</div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery
                ? 'No organizations match your search criteria'
                : 'No organizations available. Create an organization to get started!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Groups</TableHead>
                    {hasAnyActions && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.map((organization) => (
                    <TableRow
                      key={organization.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/organizations/view?id=${organization.id}`)}
                    >
                       <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {editingOrgId === organization.id ? (
                            <Input
                              value={editingOrgName}
                              onChange={(e) => setEditingOrgName(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, organization.id)}
                              onBlur={() => handleUpdateName(organization.id)}
                              autoFocus
                              className="h-8 max-w-[200px]"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <span>{organization.name}</span>
                              {canManage(organization) && (
                                <Pencil 
                                  className="h-4 w-4 text-zinc-500 hover:text-white transition-colors cursor-pointer shrink-0 animate-in fade-in duration-200" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOrgId(organization.id);
                                    setEditingOrgName(organization.name);
                                  }}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{organization.members.length}</TableCell>
                      <TableCell>{organization.groups.length}</TableCell>
                      {hasAnyActions && (
                        <TableCell className="text-right">
                          <div
                            className="flex flex-nowrap items-center justify-end gap-1 overflow-x-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canManage(organization) && (
                              <>
                                <Button 
                                  variant="destructive" 
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  title="Delete"
                                  onClick={() => handleDeleteOrganization(organization.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationList;
