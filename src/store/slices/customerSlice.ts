import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CustomerState, Customer, CustomerFormValues } from '../../types';
import { customerAPI } from '../../services/api';

const initialState: CustomerState = {
  customers: [],
  currentCustomer: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

// Async thunks
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params: { page?: number; search?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await customerAPI.getCustomers(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch customers');
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await customerAPI.getCustomerById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch customer');
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData: CustomerFormValues, { rejectWithValue }) => {
    try {
      const response = await customerAPI.createCustomer(customerData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create customer');
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, data }: { id: string; data: CustomerFormValues }, { rejectWithValue }) => {
    try {
      const response = await customerAPI.updateCustomer(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update customer');
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      await customerAPI.deleteCustomer(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete customer');
    }
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearCurrentCustomer: (state) => {
      state.currentCustomer = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch customers cases
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload.data;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch customer by ID cases
      .addCase(fetchCustomerById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCustomer = action.payload;
        state.error = null;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create customer cases
      .addCase(createCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers.unshift(action.payload);
        state.error = null;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update customer cases
      .addCase(updateCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.customers.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        if (state.currentCustomer?.id === action.payload.id) {
          state.currentCustomer = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete customer cases
      .addCase(deleteCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = state.customers.filter(c => c.id !== action.payload);
        if (state.currentCustomer?.id === action.payload) {
          state.currentCustomer = null;
        }
        state.error = null;
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, clearCurrentCustomer, clearError } = customerSlice.actions;
export default customerSlice.reducer;