import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  useTheme, 
  ActivityIndicator,
  Searchbar,
  FAB,
  Chip,
  Avatar,
  Button,
  Dialog,
  Portal,
  TextInput
} from 'react-native-paper';
import { router } from 'expo-router';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

export default function CustomersScreen() {
  const theme = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [addDialogVisible, setAddDialogVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  const fetchCustomers = async () => {
    try {
      // Use 10.0.2.2 for Android emulator to access localhost
      const response = await fetch('http://10.0.2.2:3001/customers');
      const data = await response.json();
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.log('Using fallback data (JSON server not accessible)');
      // Enhanced fallback data
      const mockData = [
        {
          id: '1',
          name: 'Acme Corporation',
          email: 'contact@acme.com',
          phone: '+1-555-0123',
          company: 'Acme Corp',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'Tech Solutions Inc',
          email: 'info@techsolutions.com',
          phone: '+1-555-0456',
          company: 'Tech Solutions',
          createdAt: '2024-01-20T14:15:00Z',
          updatedAt: '2024-01-20T14:15:00Z'
        },
        {
          id: '3',
          name: 'Global Industries',
          email: 'sales@global.com',
          phone: '+1-555-0789',
          company: 'Global Industries',
          createdAt: '2024-02-01T09:00:00Z',
          updatedAt: '2024-02-01T09:00:00Z'
        },
        {
          id: '4',
          name: 'StartUp Ventures',
          email: 'hello@startup.com',
          phone: '+1-555-0101',
          company: 'StartUp Ventures',
          createdAt: '2024-02-10T16:45:00Z',
          updatedAt: '2024-02-10T16:45:00Z'
        },
        {
          id: '5',
          name: 'Enterprise Corp',
          email: 'business@enterprise.com',
          phone: '+1-555-0202',
          company: 'Enterprise Corp',
          createdAt: '2024-02-15T11:20:00Z',
          updatedAt: '2024-02-15T11:20:00Z'
        }
      ];
      setCustomers(mockData);
      setFilteredCustomers(mockData);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.email.toLowerCase().includes(query.toLowerCase()) ||
        customer.company.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company
    });
    setEditDialogVisible(true);
  };

  const handleAddCustomer = () => {
    setAddForm({
      name: '',
      email: '',
      phone: '',
      company: ''
    });
    setAddDialogVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      // Try to update via API first
      const response = await fetch(`http://10.0.2.2:3001/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          id: selectedCustomer.id,
          createdAt: selectedCustomer.createdAt,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // API update successful, refresh data
        await fetchCustomers();
        Alert.alert('Success', 'Customer updated successfully!');
      } else {
        throw new Error('API update failed');
      }
    } catch (error) {
      // Fallback: update local state only
      const updatedCustomers = customers.map(customer =>
        customer.id === selectedCustomer.id
          ? { ...customer, ...editForm, updatedAt: new Date().toISOString() }
          : customer
      );
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);
      Alert.alert('Updated Locally', 'Customer updated in local storage (API not available)');
    }

    setEditDialogVisible(false);
    setSelectedCustomer(null);
  };

  const handleSaveNewCustomer = async () => {
    // Basic validation
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.company.trim()) {
      Alert.alert('Validation Error', 'Please fill in Name, Email, and Company fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addForm.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    const newCustomer: Customer = {
      id: Date.now().toString(), // Simple ID generation
      ...addForm,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Try to add via API first
      const response = await fetch('http://10.0.2.2:3001/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomer),
      });

      if (response.ok) {
        // API add successful, refresh data
        await fetchCustomers();
        Alert.alert('Success', 'New customer added successfully!');
      } else {
        throw new Error('API add failed');
      }
    } catch (error) {
      // Fallback: add to local state only
      const updatedCustomers = [newCustomer, ...customers];
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);
      Alert.alert('Added Locally', 'Customer added to local storage (API not available)');
    }

    setAddDialogVisible(false);
  };

  const handleViewDetails = (customer: Customer) => {
    router.push(`/customer-details?customerId=${customer.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  };

  const isFormValid = (form: typeof addForm) => {
    return form.name.trim() && form.email.trim() && form.company.trim();
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Loading customers...</Paragraph>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Customers ({filteredCustomers.length})</Title>
        <Searchbar
          placeholder="Search customers..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} style={styles.customerCard}>
            <Card.Content>
              <View style={styles.customerHeader}>
                <Avatar.Text 
                  size={50} 
                  label={getInitials(customer.name)}
                  style={styles.avatar}
                />
                <View style={styles.customerInfo}>
                  <Title style={styles.customerName}>{customer.name}</Title>
                  <Paragraph style={styles.customerCompany}>{customer.company}</Paragraph>
                </View>
              </View>
              
              <View style={styles.customerDetails}>
                <View style={styles.contactRow}>
                  <Paragraph style={styles.contactLabel}>Email:</Paragraph>
                  <Paragraph style={styles.contactValue}>{customer.email}</Paragraph>
                </View>
                <View style={styles.contactRow}>
                  <Paragraph style={styles.contactLabel}>Phone:</Paragraph>
                  <Paragraph style={styles.contactValue}>{customer.phone || 'N/A'}</Paragraph>
                </View>
                <View style={styles.contactRow}>
                  <Paragraph style={styles.contactLabel}>Added:</Paragraph>
                  <Paragraph style={styles.contactValue}>{formatDate(customer.createdAt)}</Paragraph>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Chip 
                  icon="eye" 
                  mode="outlined" 
                  compact
                  onPress={() => handleViewDetails(customer)}
                >
                  View & Leads
                </Chip>
                <Chip 
                  icon="pencil" 
                  mode="outlined" 
                  compact
                  onPress={() => handleEditCustomer(customer)}
                >
                  Edit
                </Chip>
              </View>
            </Card.Content>
          </Card>
        ))}

        {filteredCustomers.length === 0 && searchQuery !== '' && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Paragraph style={styles.emptyText}>
                No customers found matching "{searchQuery}"
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Edit Customer Dialog */}
      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Edit Customer</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name *"
              value={editForm.name}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Company *"
              value={editForm.company}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, company: text }))}
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Email *"
              value={editForm.email}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Phone"
              value={editForm.phone}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
              style={styles.dialogInput}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveCustomer}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Add Customer Dialog */}
      <Portal>
        <Dialog visible={addDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
          <Dialog.Title>Add New Customer</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name *"
              value={addForm.name}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, name: text }))}
              style={styles.dialogInput}
              mode="outlined"
              error={addForm.name.trim() === '' && addForm.name !== ''}
            />
            <TextInput
              label="Company *"
              value={addForm.company}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, company: text }))}
              style={styles.dialogInput}
              mode="outlined"
              error={addForm.company.trim() === '' && addForm.company !== ''}
            />
            <TextInput
              label="Email *"
              value={addForm.email}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.dialogInput}
              mode="outlined"
              error={addForm.email.trim() === '' && addForm.email !== ''}
            />
            <TextInput
              label="Phone (Optional)"
              value={addForm.phone}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
              style={styles.dialogInput}
              mode="outlined"
            />
            <Paragraph style={styles.helperText}>
              * Required fields
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleSaveNewCustomer}
              disabled={!isFormValid(addForm)}
            >
              Add Customer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddCustomer}
        label="Add Customer"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  customerCard: {
    marginBottom: 12,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: '#2196F3',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerCompany: {
    fontSize: 14,
    opacity: 0.7,
  },
  customerDetails: {
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 60,
    opacity: 0.7,
  },
  contactValue: {
    fontSize: 14,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  bottomPadding: {
    height: 80,
  },
  dialogInput: {
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
  },
});
