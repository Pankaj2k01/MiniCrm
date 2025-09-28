import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, Dimensions } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  useTheme, 
  ActivityIndicator,
  FAB,
  Chip,
  Avatar,
  Button,
  Dialog,
  Portal,
  TextInput,
  Divider
} from 'react-native-paper';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { PieChart } from 'react-native-chart-kit';
import { customerAPI, leadAPI } from '../src/services/api';
import { Customer, Lead, LeadFormValues } from '../src/types';

// Using Customer and Lead types from '../src/types'

const screenWidth = Dimensions.get('window').width;

export default function CustomerDetailsScreen() {
  const theme = useTheme();
  const { customerId } = useLocalSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'new' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'>('All');
  
  // Dialog states
  const [addLeadDialogVisible, setAddLeadDialogVisible] = useState(false);
  const [editLeadDialogVisible, setEditLeadDialogVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Form states
  const [addLeadForm, setAddLeadForm] = useState({
    title: '',
    description: '',
    status: 'new' as Lead['status'],
    value: ''
  });
  
  const [editLeadForm, setEditLeadForm] = useState({
    title: '',
    description: '',
    status: 'new' as Lead['status'],
    value: ''
  });

  const fetchCustomerDetails = async () => {
    try {
      // Fetch customer details using secure API
      const customerResponse = await customerAPI.getCustomerById(customerId as string);
      setCustomer(customerResponse.data);
      
      // Fetch customer-specific leads using secure API
      const leadsResponse = await leadAPI.getLeads({ customerId: customerId as string });
      setLeads(leadsResponse.data);
      setFilteredLeads(leadsResponse.data);
    } catch (error) {
      console.log('Using fallback data (JSON server not accessible)');
      // Fallback customer data
      const mockCustomer = {
        id: customerId as string,
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+1-555-0123',
        company: 'Acme Corp',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      };
      
      // Fallback leads data
      const mockLeads = [
        {
          id: '1',
          title: 'Website Redesign Project',
          description: 'Complete website overhaul with modern design',
          status: 'New' as Lead['status'],
          value: 15000,
          customerId: customerId as string,
          createdAt: '2024-01-16T08:00:00Z',
          updatedAt: '2024-01-16T08:00:00Z'
        },
        {
          id: '2',
          title: 'Mobile App Development',
          description: 'iOS and Android app development',
          status: 'Contacted' as Lead['status'],
          value: 25000,
          customerId: customerId as string,
          createdAt: '2024-01-18T10:30:00Z',
          updatedAt: '2024-01-20T15:45:00Z'
        }
      ];
      
      setCustomer(mockCustomer);
      setLeads(mockLeads);
      setFilteredLeads(mockLeads);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomerDetails();
    setRefreshing(false);
  };

  const handleStatusFilter = (status: typeof statusFilter) => {
    setStatusFilter(status);
    if (status === 'All') {
      setFilteredLeads(leads);
    } else {
      setFilteredLeads(leads.filter(lead => lead.status === status));
    }
  };

  const handleAddLead = () => {
    setAddLeadForm({
      title: '',
      description: '',
      status: 'new',
      value: ''
    });
    setAddLeadDialogVisible(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setEditLeadForm({
      title: lead.title,
      description: lead.description,
      status: lead.status,
      value: lead.value.toString()
    });
    setEditLeadDialogVisible(true);
  };

  const handleSaveNewLead = async () => {
    // Validation
    if (!addLeadForm.title.trim() || !addLeadForm.description.trim() || !addLeadForm.value.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const value = parseFloat(addLeadForm.value);
    if (isNaN(value) || value < 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive number for value');
      return;
    }

    const leadFormData: LeadFormValues = {
      title: addLeadForm.title.trim(),
      description: addLeadForm.description.trim(),
      status: addLeadForm.status,
      value: value.toString(),
      expectedCloseDate: '',
      priority: 'medium',
      source: ''
    };

    try {
      const response = await leadAPI.createLead(customerId as string, leadFormData);
      await fetchCustomerDetails();
      setAddLeadDialogVisible(false);
      Alert.alert('Success', 'New lead added successfully!');
    } catch (error: any) {
      // Fallback: add to local state only
      const updatedLeads = [newLead, ...leads];
      setLeads(updatedLeads);
      
      // Update filtered leads based on current filter
      if (statusFilter === 'All' || statusFilter === newLead.status) {
        setFilteredLeads([newLead, ...filteredLeads]);
      }
      
      Alert.alert('Added Locally', 'Lead added to local storage (API not available)');
    }

    setAddLeadDialogVisible(false);
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
        await fetchCustomerDetails();
        Alert.alert('Success', 'Lead updated successfully!');
      } else {
        throw new Error('API update failed');
      }
    } catch (error) {
      // Fallback: update local state only
      const updatedLeads = leads.map(lead =>
        lead.id === selectedLead.id ? updatedLead : lead
      );
      setLeads(updatedLeads);
      
      // Update filtered leads
      handleStatusFilter(statusFilter);
      
      Alert.alert('Updated Locally', 'Lead updated in local storage (API not available)');
    }

    setEditLeadDialogVisible(false);
    setSelectedLead(null);
  };

  const handleDeleteLead = (lead: Lead) => {
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
                await fetchCustomerDetails();
                Alert.alert('Success', 'Lead deleted successfully!');
              } else {
                throw new Error('API delete failed');
              }
            } catch (error) {
              // Fallback: remove from local state only
              const updatedLeads = leads.filter(l => l.id !== lead.id);
              setLeads(updatedLeads);
              setFilteredLeads(filteredLeads.filter(l => l.id !== lead.id));
              Alert.alert('Deleted Locally', 'Lead removed from local storage (API not available)');
            }
          }
        }
      ]
    );
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

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
  };

  // Prepare pie chart data for this customer's lead status
  const getCustomerLeadsPieData = () => {
    const statusCounts = {
      New: filteredLeads.filter(lead => lead.status === 'New').length,
      Contacted: filteredLeads.filter(lead => lead.status === 'Contacted').length,
      Converted: filteredLeads.filter(lead => lead.status === 'Converted').length,
      Lost: filteredLeads.filter(lead => lead.status === 'Lost').length,
    };
    
    return [
      {
        name: 'New',
        count: statusCounts.New,
        color: '#4CAF50',
        legendFontColor: '#7F7F7F',
        legendFontSize: 10,
      },
      {
        name: 'Contacted',
        count: statusCounts.Contacted,
        color: '#FF9800',
        legendFontColor: '#7F7F7F',
        legendFontSize: 10,
      },
      {
        name: 'Converted',
        count: statusCounts.Converted,
        color: '#2196F3',
        legendFontColor: '#7F7F7F',
        legendFontSize: 10,
      },
      {
        name: 'Lost',
        count: statusCounts.Lost,
        color: '#F44336',
        legendFontColor: '#7F7F7F',
        legendFontSize: 10,
      },
    ].filter(item => item.count > 0);
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Loading customer details...</Paragraph>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Customer Not Found' }} />
        <Paragraph>Customer not found</Paragraph>
        <Button mode="contained" onPress={() => router.back()}>Go Back</Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: customer.name }} />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Customer Info Card */}
        <Card style={styles.customerCard}>
          <Card.Content>
            <View style={styles.customerHeader}>
              <Avatar.Text 
                size={60} 
                label={getInitials(customer.name)}
                style={styles.avatar}
              />
              <View style={styles.customerInfo}>
                <Title style={styles.customerName}>{customer.name}</Title>
                <Paragraph style={styles.customerCompany}>{customer.company}</Paragraph>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
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
          </Card.Content>
        </Card>

        {/* Leads Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Leads Summary</Title>
            <View style={styles.statsContainer}>
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
            
            {/* Mini Chart for Lead Status */}
            {filteredLeads.length > 0 && getCustomerLeadsPieData().length > 0 ? (
              <View style={styles.miniChartContainer}>
                <Paragraph style={styles.chartLabel}>Lead Status Distribution</Paragraph>
                <PieChart
                  data={getCustomerLeadsPieData()}
                  width={screenWidth - 96}
                  height={140}
                  chartConfig={chartConfig}
                  accessor="count"
                  backgroundColor="transparent"
                  paddingLeft="10"
                  center={[0, 0]}
                  hasLegend={true}
                />
              </View>
            ) : null}
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

        {/* Leads List */}
        <Title style={styles.leadsTitle}>
          Leads ({filteredLeads.length})
        </Title>
        
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
                {statusFilter === 'All' 
                  ? "No leads found for this customer"
                  : `No ${statusFilter.toLowerCase()} leads found`
                }
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Lead Dialog */}
      <Portal>
        <Dialog visible={addLeadDialogVisible} onDismiss={() => setAddLeadDialogVisible(false)}>
          <Dialog.Title>Add New Lead</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title *"
              value={addLeadForm.title}
              onChangeText={(text) => setAddLeadForm(prev => ({ ...prev, title: text }))}
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Description *"
              value={addLeadForm.description}
              onChangeText={(text) => setAddLeadForm(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
              mode="outlined"
            />
            <TextInput
              label="Value (USD) *"
              value={addLeadForm.value}
              onChangeText={(text) => setAddLeadForm(prev => ({ ...prev, value: text }))}
              keyboardType="numeric"
              style={styles.dialogInput}
              mode="outlined"
            />
            <View style={styles.pickerContainer}>
              <Paragraph style={styles.pickerLabel}>Status:</Paragraph>
              <Picker
                selectedValue={addLeadForm.status}
                onValueChange={(value) => setAddLeadForm(prev => ({ ...prev, status: value }))}
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
            <Button onPress={() => setAddLeadDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveNewLead}>Add Lead</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddLead}
        label="Add Lead"
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  customerCard: {
    marginBottom: 16,
    elevation: 4,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#2196F3',
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerCompany: {
    fontSize: 16,
    opacity: 0.7,
  },
  divider: {
    marginVertical: 16,
  },
  customerDetails: {
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '500',
    width: 80,
    opacity: 0.7,
  },
  contactValue: {
    fontSize: 16,
    flex: 1,
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  filterCard: {
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
  leadsTitle: {
    fontSize: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
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
  miniChartContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.8,
  },
});
