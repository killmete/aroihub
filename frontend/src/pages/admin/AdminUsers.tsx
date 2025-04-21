import React, { useState, useEffect } from 'react';
import { userService } from '@/services/userService.ts';
import { User } from '@/types/auth.ts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowUpIcon, ArrowDownIcon, UserRound, ChevronLeft, ChevronRight, Edit, ArrowUpDown } from 'lucide-react';
import logger from '../../utils/logger';

// Type for sorting options
type SortField = 'id' | 'username' | 'email' | 'first_name' | 'last_name' | 'role_id';
type SortDirection = 'asc' | 'desc';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [hasRoleChanged, setHasRoleChanged] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: 'id',
    direction: 'asc'
  });

  const [filterOptions, setFilterOptions] = useState({
    role: 'all',
    searchTerm: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Apply filters when users or filter options change
    applyFilters();
  }, [users, filterOptions]);
  
  useEffect(() => {
    // Apply sorting and pagination when filtered users or sorting/pagination options change
    if (filteredUsers.length > 0) {
      const sortedData = sortUsers(filteredUsers);
      setTotalPages(Math.ceil(sortedData.length / rowsPerPage));
      
      // Reset to first page if current page exceeds total pages
      if (currentPage > Math.ceil(sortedData.length / rowsPerPage)) {
        setCurrentPage(1);
      }
      
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      setDisplayedUsers(sortedData.slice(startIndex, endIndex));
    } else {
      setDisplayedUsers([]);
      setTotalPages(1);
    }
  }, [filteredUsers, currentPage, rowsPerPage, sortConfig]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...users];
    
    // Filter by role
    if (filterOptions.role !== 'all') {
      const roleId = parseInt(filterOptions.role, 10);
      if (!isNaN(roleId)) {
        filtered = filtered.filter(user => user.role_id === roleId);
      }
    }
    
    // Filter by search term
    if (filterOptions.searchTerm) {
      const searchLower = filterOptions.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        (user.username && user.username.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower)) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredUsers(filtered);
  };

  // Sort users based on current sort configuration
  const sortUsers = (data: User[]): User[] => {
    return [...data].sort((a, b) => {
      const field = sortConfig.field as keyof User;

      let aValue = a[field];
      let bValue = b[field];

      // Handle null or undefined values
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Special handling for role_id to sort by role name
      if (field === 'role_id') {
        aValue = aValue === 2 ? 'Admin' : 'User';
        bValue = bValue === 2 ? 'Admin' : 'User';
      }

      // Compare values based on sort direction
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };


  // Handle sorting when a column header is clicked
  const handleSort = (field: SortField) => {
    setSortConfig({
      field,
      direction: 
        sortConfig.field === field && sortConfig.direction === 'asc' 
          ? 'desc' 
          : 'asc'
    });
  };

  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUpIcon className="h-4 w-4 ml-1" /> 
      : <ArrowDownIcon className="h-4 w-4 ml-1" />;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value, 10));
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number || '',
      role_id: user.role_id || 0,
    });
    setIsEditModalOpen(true);
    setHasRoleChanged(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    const newRoleId = Number(value);
    setHasRoleChanged(editingUser?.role_id !== newRoleId);
    setFormData(prev => ({ ...prev, role_id: newRoleId }));
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      const updatedUser = await userService.updateUser(editingUser.id, formData);
      
      // Immediately update the user in the local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === editingUser.id ? { ...user, ...updatedUser } : user
        )
      );
      
      if (hasRoleChanged) {
        setSuccessMessage("User updated successfully. Role changes will take effect when the user logs out and logs back in.");
        toast.success("User updated. Role changes require re-login.");
      } else {
        setSuccessMessage("User updated successfully. Changes are effective immediately.");
        toast.success("User updated successfully.");
      }
      
      // Close the modal
      setIsEditModalOpen(false);
      
      // Optional: Refresh all users data after a short delay to ensure server-side consistency
      setTimeout(() => {
        fetchUsers();
      }, 3000);
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      logger.error('Failed to update user:', err);
      toast.error('Failed to update user. Please try again.');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-3xl font-bold mb-6 text-blue-accent hidden lg:block">จัดการผู้ใช้</h2>
        <div className="bg-white p-6 rounded-lg shadow flex justify-center items-center h-96">
          <div className="loading loading-spinner loading-lg text-orange-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h2 className="text-3xl font-bold mb-6 text-blue-accent hidden lg:block">จัดการผู้ใช้</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-red-500 text-center py-8">
            Error: {error}. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold mb-6 text-blue-accent">จัดการผู้ใช้</h2>
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}
      
      <div className="bg-white p-4 md:p-6 rounded-lg shadow">
        <div className="flex flex-col mb-6 gap-4">
          <h3 className="text-xl font-medium">Users</h3>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Search Input */}
            <div className="w-full sm:w-64">
              <Input 
                placeholder="Search users..." 
                value={filterOptions.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              />
            </div>
            
            {/* Role Filter */}
            <div className="w-full sm:w-36">
              <Select
                value={filterOptions.role}
                onValueChange={(value) => handleFilterChange('role', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="1">User</SelectItem>
                  <SelectItem value="2">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Rows Per Page Selection */}
            <div className="w-full sm:w-36">
              <Select
                value={rowsPerPage.toString()}
                onValueChange={handleRowsPerPageChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchUsers} variant="outline" className="w-full sm:w-auto">
              Refresh
            </Button>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No users found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500">Avatar</th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center">
                        ID {getSortIcon('id')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('username')}
                    >
                      <div className="flex items-center">
                        Username {getSortIcon('username')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email {getSortIcon('email')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('first_name')}
                    >
                      <div className="flex items-center">
                        First Name {getSortIcon('first_name')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('last_name')}
                    >
                      <div className="flex items-center">
                        Last Name {getSortIcon('last_name')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer"
                      onClick={() => handleSort('role_id')}
                    >
                      <div className="flex items-center">
                        Role {getSortIcon('role_id')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-500 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full">
                            {user.profile_picture_url ? (
                              <img
                                src={user.profile_picture_url}
                                alt="User avatar"
                                className="object-cover w-full h-full rounded-full"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                                <UserRound className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{user.id}</td>
                      <td className="px-4 py-3 text-sm">{user.username}</td>
                      <td className="px-4 py-3 text-sm">{user.email}</td>
                      <td className="px-4 py-3 text-sm">{user.first_name}</td>
                      <td className="px-4 py-3 text-sm">{user.last_name}</td>
                      <td className="px-4 py-3 text-sm">
                        {user.role_id === 2 ? 'Admin' : 'User'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex justify-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="text-amber-600"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {displayedUsers.map((user) => (
                <div key={user.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-100">
                        {user.profile_picture_url ? (
                          <img
                            src={user.profile_picture_url}
                            alt="User avatar"
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                            <UserRound className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{user.username}</h4>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role_id === 2 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role_id === 2 ? 'Admin' : 'User'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                    <div>
                      <span className="font-medium">ID: </span>
                      {user.id}
                    </div>
                    <div>
                      <span className="font-medium">Name: </span>
                      {user.first_name} {user.last_name}
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    className="text-amber-600 w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    <span>Edit User</span>
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Pagination - Responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 gap-4">
              <div className="text-sm text-gray-500 text-center sm:text-left">
                Showing {displayedUsers.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} 
                - {Math.min(currentPage * rowsPerPage, filteredUsers.length)} 
                {" "}of {filteredUsers.length} users
              </div>
              
              <div className="flex items-center justify-center sm:justify-end space-x-1 sm:space-x-2">
                {/* First/Prev buttons - Hidden on mobile */}
                <div className="hidden sm:block">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="h-8"
                  >
                    First
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page numbers - Hidden on mobile */}
                <div className="hidden sm:flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else {
                      if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                    }

                    return (
                      <Button
                        key={i}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                {/* Mobile page indicator */}
                <div className="sm:hidden">
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Last button - Hidden on mobile */}
                <div className="hidden sm:block">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8"
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-blue-accent">User Details</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {editingUser && (
                <>Editing user <span className="font-medium text-blue-accent">{editingUser.username}</span> (ID: {editingUser.id})</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="pt-6 pb-2">
            {editingUser?.profile_picture_url && (
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-md">
                  <img 
                    src={editingUser.profile_picture_url} 
                    alt={`${editingUser.username} profile`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="md:col-span-2">
                <Label htmlFor="username" className="font-medium text-gray-700 mb-1.5 block">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="email" className="font-medium text-gray-700 mb-1.5 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              
              <div>
                <Label htmlFor="first_name" className="font-medium text-gray-700 mb-1.5 block">
                  First Name
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              
              <div>
                <Label htmlFor="last_name" className="font-medium text-gray-700 mb-1.5 block">
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              
              <div>
                <Label htmlFor="phone_number" className="font-medium text-gray-700 mb-1.5 block">
                  Phone Number
                </Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number || ''}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 focus:bg-white transition-colors"
                />
              </div>
              
              <div>
                <Label htmlFor="role" className="font-medium text-gray-700 mb-1.5 block">
                  Role
                </Label>
                <Select
                  value={formData.role_id?.toString() || '1'}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger className="w-full bg-gray-50 focus:bg-white transition-colors">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">User</SelectItem>
                    <SelectItem value="2">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {hasRoleChanged && (
                  <p className="text-amber-600 text-sm mt-1.5 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Role changes require user re-login
                  </p>
                )}
              </div>
            </div>
              
            <div className="border-t mt-6 pt-5">
              <p className="text-xs text-gray-500 mb-2">
                <span className="font-medium">Last Updated:</span> {editingUser?.updated_at ? new Date(editingUser.updated_at).toLocaleString() : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Account Created:</span> {editingUser?.created_at ? new Date(editingUser.created_at).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUser}
              className="bg-blue-accent hover:bg-blue-accent-200"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;