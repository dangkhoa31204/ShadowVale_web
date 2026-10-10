import { axiosClient } from '../../services/api/axiosClient';
import type { CreateUserRequest, UpdateUserRequest, UserDto, PagedResultOfUserDto } from '../../services/api/contracts';
export interface UserFilters { search?: string; role?: string; isActive?: boolean; page?: number; pageSize?: number }
export const usersApi = {
  list: async (filters: UserFilters = {}, signal?: AbortSignal) => (await axiosClient.get<PagedResultOfUserDto>('/users', { params: { ...filters, page: filters.page || 1, pageSize: filters.pageSize || 20 }, signal })).data,
  details: async (id: string) => (await axiosClient.get<UserDto>('/users/' + encodeURIComponent(id))).data,
  create: async (request: CreateUserRequest) => (await axiosClient.post<UserDto>('/users', request)).data,
  update: async (id: string, request: UpdateUserRequest) => (await axiosClient.put<UserDto>('/users/' + encodeURIComponent(id), request)).data,
  resetPassword: async (id: string, newPassword: string) => { await axiosClient.put('/users/' + encodeURIComponent(id) + '/password', { newPassword }); },
};
