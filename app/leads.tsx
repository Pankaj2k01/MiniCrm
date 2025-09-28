import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, Dimensions } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  useTheme, 
  ActivityIndicator,
  Searchbar,
  Chip,
  Avatar,
  Button,
  Dialog,
  Portal,
  TextInput
} from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { PieChart } from 'react-native-chart-kit';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  title: string;
  description: string;
  status: 'New' | 'Contacted' | 'Converted' | 'Lost';
  value: number;
  customerId: string;
  createdAt: string;
  updatedAt: string;
}

interface LeadWithCustomer extends Lead {
  customer?: Customer;
}

const screenWidth = Dimensions.get('window').width;

export default function LeadsScreen() {
  const theme = useTheme();
  const [leads, setLeads] = useState<LeadWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'New' | 'Contacted' | 'Converted' | 'Lost'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [editLeadDialogVisible, setEditLeadDialogVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithCustomer | null>(null);
  
  // Form states
  const [editLeadForm, setEditLeadForm] = useState({
    title: '',
    description: '',
    status: 'New' as Lead['status'],
    value: ''
  });

  const fetchLeadsData = async () => {
    try {
      // Use 10.0.2.2 for Android emulator to access localhost
      const [leadsResponse, customersResponse] = await Promise.all([
        fetch('http://10.0.2.2:3001/leads'),
        fetch('http://10.0.2.2:3001/customers')
      ]);
      
      const leadsData = await leadsResponse.json();
      const customersData = await customersResponse.json();
      
      setCustomers(customersData);
      
      // Combine leads with customer data
      const leadsWithCustomers = leadsData.map((lead: Lead) => ({
        ...lead,
        customer: customersData.find((customer: Customer) => customer.id === lead.customerId)
      }));
      
      setLeads(leadsWithCustomers);
      setFilteredLeads(leadsWithCustomers);
    } catch (error) {
      console.log('Using fallback data (JSON server not accessible)');
      
      // Fallback data
      const mockCustomers = [
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
        }
      ];

      const mockLeads: LeadWithCustomer[] = [
        {
          id: '1',
          title: 'Website Redesign Project',
          description: 'Complete website overhaul with modern design',
          status: 'New',
          value: 15000,
          customerId: '1',
          createdAt: '2024-01-16T08:00:00Z',
          updatedAt: '2024-01-16T08:00:00Z',
          customer: mockCustomers[0]
        },
        {
          id: '2',
          title: 'Mobile App Development',
          description: 'iOS and Android app development',
          status: 'Contacted',
          value: 25000,
          customerId: '1',
          createdAt: '2024-01-18T10:30:00Z',
          updatedAt: '2024-01-20T15:45:00Z',
          customer: mockCustomers[0]
        },
        {
          id: '3',
          title: 'CRM Integration',
          description: 'Integration with existing CRM system',
          status: 'Converted',
          value: 12000,
          customerId: '2',
          createdAt: '2024-01-22T09:15:00Z',
          updatedAt: '2024-02-01T14:30:00Z',
          customer: mockCustomers[1]
        },
        {
          id: '4',
          title: 'Cloud Migration',
          description: 'Migrate infrastructure to AWS',
          status: 'Lost',
          value: 30000,
          customerId: '2',
          createdAt: '2024-01-25T11:00:00Z',
          updatedAt: '2024-02-05T16:20:00Z',
          customer: mockCustomers[1]
        },
        {
          id: '5',
          title: 'E-commerce Platform',
          description: 'Custom e-commerce solution',
          status: 'New',
          value: 40000,
          customerId: '3',
          createdAt: '2024-02-02T13:30:00Z',
          updatedAt: '2024-02-02T13:30:00Z',
          customer: mockCustomers[2]
        },
        {
          id: '6',
          title: 'Data Analytics Dashboard',
          description: 'Business intelligence dashboard',
          status: 'Contacted',
          value: 18000,
          customerId: '3',
          createdAt: '2024-02-05T10:45:00Z',
          updatedAt: '2024-02-08T12:15:00Z',
          customer: mockCustomers[2]
        }
      ];
      
      setCustomers(mockCustomers);
      setLeads(mockLeads);
      setFilteredLeads(mockLeads);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeadsData();
    setRefreshing(false);
  };

  const applyFilters = (leads: LeadWithCustomer[], status: typeof statusFilter, search: string) => {
    let filtered = leads;

    // Filter by status
    if (status !== 'All') {
      filtered = filtered.filter(lead => lead.status === status);
    }

    // Filter by search query
    if (search.trim()) {
      filtered = filtered.filter(lead =>
        lead.title.toLowerCase().includes(search.toLowerCase()) ||
        lead.description.toLowerCase().includes(search.toLowerCase()) ||
        lead.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.customer?.company.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  };

  const handleStatusFilter = (status: typeof statusFilter) => {
    setStatusFilter(status);
    const filtered = applyFilters(leads, status, searchQuery);
    setFilteredLeads(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = applyFilters(leads, statusFilter, query);
    setFilteredLeads(filtered);
  };

  const handleEditLead = (lead: LeadWithCustomer) => {
    setSelectedLead(lead);
    setEditLeadForm({
      title: lead.title,
      description: lead.description,
      status: lead.status,
      value: lead.value.toString()
    });
    setEditLeadDialogVisible(true);
  };

  const handleSaveLead = async () => {
    if (!selectedLead) return;

    // Validation
    if (!editLeadForm.title.trim() || !editLeadForm.description.trim() || !editLeadForm.value.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const value = parseFloat(editLeadForm.value);
    if (isNaN(value) || value < 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive number for value');
      return;
    }

    const updatedLead = {
      ...selectedLead,
      title: editLeadForm.title.trim(),
      description: editLeadForm.description.trim(),
      status: editLeadForm.status,
      value: value,
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`http://10.0.2.2:3001/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedLead),
      });

      if (response.ok) {
        await fetchLeadsData();
        Alert.alert('Success', 'Lead updated successfully!');
      } else {
        throw new Error('API update failed');
      }
    } catch (error) {
      // Fallback: update local state only
      const updatedLeads = leads.map(lead =>
        lead.id === selectedLead.id ? { ...updatedLead, customer: selectedLead.customer } : lead
      );
      setLeads(updatedLeads);
      
      // Reapply filters
      const filtered = applyFilters(updatedLeads, statusFilter, searchQuery);
      setFilteredLeads(filtered);
      
      Alert.alert('Updated Locally', 'Lead updated in local storage (API not available)');
    }

    setEditLeadDialogVisible(false);
    setSelectedLead(null);
  };

  const handleDeleteLead = (lead: LeadWithCustomer) => {
    Alert.alert(
      'Delete Lead',
      `Are you sure you want to delete "${lead.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`http://10.0.2.2:3001/leads/${lead.id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                await fetchLeadsData();
                Alert.alert('Success', 'Lead deleted successfully!');
              } else {
                throw new Error('API delete failed');
              }
            } catch (error) {
              // Fallback: remove from local state only
              const updatedLeads = leads.filter(l => l.id !== lead.id);
              setLeads(updatedLeads);
              
              const filtered = applyFilters(updatedLeads, statusFilter, searchQuery);
              setFilteredLeads(filtered);
              
              Alert.alert('Deleted Locally', 'Lead removed from local storage (API not available)');
            }
          }
        }
      ]
    );
  };

  const handleViewCustomer = (customerId: string) => {
    router.push(`/customer-details?customerId=${customerId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return '#4CAF50';
      case 'Contacted': return '#FF9800';
      case 'Converted': return '#2196F3';
      case 'Lost': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  };

  const getTotalLeadValue = () => {
    return filteredLeads.reduce((sum, lead) => sum + lead.value, 0);
  };

  const getStatusCounts = () => {
    return {
      New: filteredLeads.filter(lead => lead.status === 'New').length,
      Contacted: filteredLeads.filter(lead => lead.status === 'Contacted').length,
      Converted: filteredLeads.filter(lead => lead.status === 'Converted').length,
      Lost: filteredLeads.filter(lead => lead.status === 'Lost').length,
    };
  };

  // Chart configuration for leads screen
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
  };

  // Prepare pie chart data for lead status distribution
  const getLeadsPieChartData = () => {
    const statusCounts = getStatusCounts();
    
    return [
      {
        name: 'New',
        count: statusCounts.New,
        color: '#4CAF50',
        legendFontColor: '#7F7F7F',
        legendFontSize: 11,
      },
      {
        name: 'Contacted',
        count: statusCounts.Contacted,
        color: '#FF9800',
        legendFontColor: '#7F7F7F',
        legendFontSize: 11,
      },
      {
        name: 'Converted',
        count: statusCounts.Converted,
        color: '#2196F3',
        legendFontColor: '#7F7F7F',
        legendFontSize: 11,
      },
      {
        name: 'Lost',
        count: statusCounts.Lost,
        color: '#F44336',
        legendFontColor: '#7F7F7F',
        legendFontSize: 11,
      },
    ].filter(item => item.count > 0); // Only show statuses with data
  };

  useEffect(() => {
    fetchLeadsData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Loading leads...</Paragraph>
      </View>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'All Leads' }} />
      
      <View style={styles.header}>
        <Title style={styles.headerTitle}>
          All Leads ({filteredLeads.length})
        </Title>
        <Searchbar
          placeholder="Search leads or customers..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Summary Stats */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Leads Overview</Title>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Title style={[styles.statNumber, { color: '#4CAF50' }]}>
                {filteredLeads.length}
              </Title>
              <Paragraph style={styles.statLabel}>Total Leads</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Title style={[styles.statNumber, { color: '#2196F3' }]}>
                {formatCurrency(getTotalLeadValue())}
              </Title>
              <Paragraph style={styles.statLabel}>Total Value</Paragraph>
            </View>
          </View>
          
          {/* Status Distribution Chart */}
          {filteredLeads.length > 0 ? (
            <View style={styles.chartContainer}>
              <PieChart
                data={getLeadsPieChartData()}
                width={screenWidth - 64}
                height={180}
                chartConfig={chartConfig}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 0]}
                hasLegend={true}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Paragraph style={styles.noDataText}>No leads available for chart</Paragraph>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Status Filter */}
      <Card style={styles.filterCard}>
        <Card.Content>
          <Title style={styles.filterTitle}>Filter by Status</Title>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {['All', 'New', 'Contacted', 'Converted', 'Lost'].map((status) => (
                <Chip
                  key={status}
                  mode={statusFilter === status ? 'flat' : 'outlined'}
                  selected={statusFilter === status}
                  onPress={() => handleStatusFilter(status as typeof statusFilter)}
                  style={styles.filterChip}
                >
                  {status}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </Card.Content>
      </Card>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredLeads.map((lead) => (
          <Card key={lead.id} style={styles.leadCard}>
            <Card.Content>
              <View style={styles.leadHeader}>
                <View style={styles.leadTitleContainer}>
                  <Title style={styles.leadTitle}>{lead.title}</Title>
                  <Chip
                    mode="flat"
                    style={[styles.statusChip, { backgroundColor: getStatusColor(lead.status) }]}
                    textStyle={{ color: 'white', fontSize: 12 }}
                  >
                    {lead.status}
                  </Chip>
                </View>
                <Title style={[styles.leadValue, { color: '#4CAF50' }]}>
                  {formatCurrency(lead.value)}
                </Title>
              </View>
              
              <Paragraph style={styles.leadDescription}>{lead.description}</Paragraph>
              
              {/* Customer Info */}
              {lead.customer && (
                <View style={styles.customerSection}>
                  <View style={styles.customerHeader}>
                    <Avatar.Text 
                      size={32} 
                      label={getInitials(lead.customer.name)}
                      style={styles.smallAvatar}
                    />
                    <View style={styles.customerInfo}>
                      <Paragraph style={styles.customerName}>{lead.customer.name}</Paragraph>
                      <Paragraph style={styles.customerCompany}>{lead.customer.company}</Paragraph>
                    </View>
                    <Button 
                      mode="outlined" 
                      compact
                      onPress={() => handleViewCustomer(lead.customerId)}
                      style={styles.viewCustomerButton}
                    >
                      View Customer
                    </Button>
                  </View>
                </View>
              )}
              
              <View style={styles.leadFooter}>
                <Paragraph style={styles.leadDate}>
                  Created: {formatDate(lead.createdAt)}
                </Paragraph>
                <View style={styles.leadActions}>
                  <Button 
                    mode="outlined" 
                    compact
                    onPress={() => handleEditLead(lead)}
                    style={styles.actionButton}
                  >
                    Edit
                  </Button>
                  <Button 
                    mode="outlined" 
                    compact
                    onPress={() => handleDeleteLead(lead)}
                    buttonColor="#ffebee"
                    textColor="#d32f2f"
                    style={styles.actionButton}
                  >
                    Delete
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}

        {filteredLeads.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Paragraph style={styles.emptyText}>
                {searchQuery.trim() 
                  ? `No leads found matching "${searchQuery}"`
                  : statusFilter === 'All' 
                    ? "No leads found"
                    : `No ${statusFilter.toLowerCase()} leads found`
                }
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Edit Lead Dialog */}
      <Portal>
        <Dialog visible={editLeadDialogVisible} onDismiss={() => setEditLeadDialogVisible(false)}>
          <Dialog.Title>Edit Lead</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title *"
              value={editLeadForm.title}
              onChangeText={(text) => setEditLeadForm(prev => ({ ...prev, title: text }))}
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Description *"
              value={editLeadForm.description}
              onChangeText={(text) => setEditLeadForm(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Value (USD) *"
              value={editLeadForm.value}
              onChangeText={(text) => setEditLeadForm(prev => ({ ...prev, value: text }))}
              keyboardType="numeric"
              style={styles.dialogInput}
              mode="outlined"
            />
            <View style={styles.pickerContainer}>
              <Paragraph style={styles.pickerLabel}>Status:</Paragraph>
              <Picker
                selectedValue={editLeadForm.status}
                onValueChange={(value) => setEditLeadForm(prev => ({ ...prev, status: value }))}
                style={styles.picker}
              >
                <Picker.Item label="New" value="New" />
                <Picker.Item label="Contacted" value="Contacted" />
                <Picker.Item label="Converted" value="Converted" />
                <Picker.Item label="Lost" value="Lost" />
              </Picker>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditLeadDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveLead}>Save Changes</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 16,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  filterCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
  },
  filterTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  leadCard: {
    marginBottom: 12,
    elevation: 3,
  },
  leadHeader: {
    marginBottom: 12,
  },
  leadTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    height: 28,
  },
  leadValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  leadDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  customerSection: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAvatar: {
    backgroundColor: '#2196F3',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerCompany: {
    fontSize: 12,
    opacity: 0.7,
  },
  viewCustomerButton: {
    marginLeft: 8,
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  leadActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 8,
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
  bottomPadding: {
    height: 80,
  },
  dialogInput: {
    marginBottom: 12,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  picker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
});