import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LeadState, Lead, LeadFormValues, LeadStatus } from '../../types';
import { leadAPI } from '../../services/api';

const initialState: LeadState = {
  leads: [],
  filteredLeads: [],
  isLoading: false,
  error: null,
  statusFilter: 'All',
};

// Async thunks
export const fetchLeads = createAsyncThunk(
  'leads/fetchLeads',
  async (params: { customerId?: string; status?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await leadAPI.getLeads(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch leads');
    }
  }
);

export const createLead = createAsyncThunk(
  'leads/createLead',
  async ({ customerId, leadData }: { customerId: string; leadData: LeadFormValues }, { rejectWithValue }) => {
    try {
      const response = await leadAPI.createLead(customerId, leadData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create lead');
    }
  }
);

export const updateLead = createAsyncThunk(
  'leads/updateLead',
  async ({ id, data }: { id: string; data: LeadFormValues }, { rejectWithValue }) => {
    try {
      const response = await leadAPI.updateLead(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update lead');
    }
  }
);

export const deleteLead = createAsyncThunk(
  'leads/deleteLead',
  async (id: string, { rejectWithValue }) => {
    try {
      await leadAPI.deleteLead(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete lead');
    }
  }
);

const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    setStatusFilter: (state, action: PayloadAction<LeadStatus | 'All'>) => {
      state.statusFilter = action.payload;
      if (action.payload === 'All') {
        state.filteredLeads = state.leads;
      } else {
        state.filteredLeads = state.leads.filter(lead => lead.status === action.payload);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch leads cases
      .addCase(fetchLeads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads = action.payload;
        // Apply current filter
        if (state.statusFilter === 'All') {
          state.filteredLeads = action.payload;
        } else {
          state.filteredLeads = action.payload.filter(lead => lead.status === state.statusFilter);
        }
        state.error = null;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create lead cases
      .addCase(createLead.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createLead.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads.unshift(action.payload);
        // Update filtered leads if the new lead matches the current filter
        if (state.statusFilter === 'All' || state.statusFilter === action.payload.status) {
          state.filteredLeads.unshift(action.payload);
        }
        state.error = null;
      })
      .addCase(createLead.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update lead cases
      .addCase(updateLead.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.leads.findIndex(l => l.id === action.payload.id);
        if (index !== -1) {
          state.leads[index] = action.payload;
        }
        
        // Update filtered leads
        const filteredIndex = state.filteredLeads.findIndex(l => l.id === action.payload.id);
        if (filteredIndex !== -1) {
          if (state.statusFilter === 'All' || state.statusFilter === action.payload.status) {
            state.filteredLeads[filteredIndex] = action.payload;
          } else {
            state.filteredLeads.splice(filteredIndex, 1);
          }
        } else if (state.statusFilter === 'All' || state.statusFilter === action.payload.status) {
          state.filteredLeads.push(action.payload);
        }
        
        state.error = null;
      })
      .addCase(updateLead.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete lead cases
      .addCase(deleteLead.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads = state.leads.filter(l => l.id !== action.payload);
        state.filteredLeads = state.filteredLeads.filter(l => l.id !== action.payload);
        state.error = null;
      })
      .addCase(deleteLead.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setStatusFilter, clearError } = leadSlice.actions;
export default leadSlice.reducer;