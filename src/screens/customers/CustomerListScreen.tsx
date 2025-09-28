import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Customer } from '../../types';
import { customerAPI } from '../../services/api';
import { CanCreate, CanUpdate, CanDelete } from '../../components/RBAC/PermissionGate';
import { theme } from '../../theme';

const CustomerListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery]);

  const loadCustomers = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await customerAPI.getCustomers();
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      if (error.message?.includes('Unauthorized')) {
        Alert.alert('Access Denied', 'You do not have permission to view customers');
      } else {
        Alert.alert('Error', 'Failed to load customers');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.company?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  };

  const handleRefresh = () => {
    loadCustomers(true);
  };

  const handleCreateCustomer = () => {
    navigation.navigate('CustomerForm' as never);
  };

  const handleCustomerPress = (customer: Customer) => {
    navigation.navigate('CustomerDetails' as never, { customerId: customer.id } as never);
  };

  const handleEditCustomer = (customer: Customer) => {
    navigation.navigate('CustomerForm' as never, { customer } as never);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await customerAPI.deleteCustomer(customer.id);
              Alert.alert('Success', 'Customer deleted successfully');
              loadCustomers();
            } catch (error: any) {
              console.error('Failed to delete customer:', error);
              if (error.message?.includes('Unauthorized')) {
                Alert.alert('Access Denied', 'You do not have permission to delete this customer');
              } else {
                Alert.alert('Error', 'Failed to delete customer');
              }
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '#28a745';
      case 'inactive':
        return '#dc3545';
      case 'prospect':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const renderCustomerItem = ({ item: customer }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => handleCustomerPress(customer)}
    >
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{customer.name}</Text>
        <Text style={styles.customerEmail}>{customer.email}</Text>
        <Text style={styles.customerCompany}>{customer.company}</Text>
        <View style={styles.customerMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(customer.status) }]}>
            <Text style={styles.statusText}>{customer.status.toUpperCase()}</Text>
          </View>
          {customer.tags && customer.tags.length > 0 && (
            <View style={styles.tagContainer}>
              {customer.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {customer.tags.length > 2 && (
                <Text style={styles.moreTagsText}>+{customer.tags.length - 2}</Text>
              )}
            </View>
          )}
        </View>
        {customer.value && (
          <Text style={styles.customerValue}>
            ${customer.value.toLocaleString()}
          </Text>
        )}
      </View>
      <View style={styles.customerActions}>
        <CanUpdate resource="customers" record={customer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditCustomer(customer)}
          >
            <Ionicons name="pencil" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </CanUpdate>
        <CanDelete resource="customers" record={customer}>
          <TouchableOpacity
            style={[styles.actionButton, { marginLeft: 10 }]}
            onPress={() => handleDeleteCustomer(customer)}
          >
            <Ionicons name="trash" size={20} color="#dc3545" />
          </TouchableOpacity>
        </CanDelete>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <CanCreate resource="customers">
          <TouchableOpacity style={styles.addButton} onPress={handleCreateCustomer}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </CanCreate>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearch}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {filteredCustomers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No customers found' : 'No customers yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'Create your first customer to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  clearSearch: {
    padding: 5,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  customerCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  customerCompany: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  customerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 5,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#999',
  },
  customerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  customerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
});

export default CustomerListScreen;
