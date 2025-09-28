import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { User, Team } from '../types';
import { userAPI, teamAPI } from '../services/api';
import { ManagerOrAdmin, AdminOnly } from '../components/RBAC/PermissionGate';
import { theme } from '../theme';

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'sales_rep';
  teamId: string;
  department: string;
}

const initialUserForm: UserFormData = {
  name: '',
  email: '',
  phone: '',
  role: 'sales_rep',
  teamId: '',
  department: '',
};

export const UserManagementScreen: React.FC = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialUserForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await teamAPI.getTeams();
      if (response.success) {
        setTeams(response.data);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData(initialUserForm);
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      teamId: user.teamId || '',
      department: user.department || '',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        await userAPI.updateUser(editingUser.id, {
          ...formData,
          isActive: true,
        });
        Alert.alert('Success', 'User updated successfully');
      } else {
        await userAPI.createUser({
          ...formData,
          isActive: true,
        });
        Alert.alert('Success', 'User created successfully');
      }
      setModalVisible(false);
      loadUsers();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      Alert.alert('Error', error.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateUser = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Error', 'You cannot deactivate your own account');
      return;
    }

    Alert.alert(
      'Deactivate User',
      `Are you sure you want to deactivate ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await userAPI.deactivateUser(user.id);
              Alert.alert('Success', 'User deactivated successfully');
              loadUsers();
            } catch (error: any) {
              console.error('Failed to deactivate user:', error);
              Alert.alert('Error', error.message || 'Failed to deactivate user');
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#dc3545';
      case 'manager':
        return '#fd7e14';
      case 'sales_rep':
        return '#198754';
      default:
        return '#6c757d';
    }
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return 'No Team';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  const renderUserItem = ({ item: user }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <Text style={styles.userDetails}>
          {user.department} • {getTeamName(user.teamId)}
        </Text>
        <View style={styles.badgeContainer}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user.role) }]}>
            <Text style={styles.roleBadgeText}>{user.role.toUpperCase()}</Text>
          </View>
          {!user.isActive && (
            <View style={[styles.statusBadge, { backgroundColor: '#dc3545' }]}>
              <Text style={styles.statusBadgeText}>INACTIVE</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditUser(user)}
        >
          <Ionicons name="pencil" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <AdminOnly>
          <TouchableOpacity
            style={[styles.actionButton, { marginLeft: 10 }]}
            onPress={() => handleDeactivateUser(user)}
          >
            <Ionicons name="person-remove" size={20} color="#dc3545" />
          </TouchableOpacity>
        </AdminOnly>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ManagerOrAdmin
      fallback={
        <SafeAreaView style={styles.container}>
          <View style={styles.unauthorizedContainer}>
            <Ionicons name="lock-closed" size={64} color="#6c757d" />
            <Text style={styles.unauthorizedText}>
              You don't have permission to access user management
            </Text>
          </View>
        </SafeAreaView>
      }
      showFallback
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>User Management</Text>
          <AdminOnly>
            <TouchableOpacity style={styles.addButton} onPress={handleCreateUser}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </AdminOnly>
        </View>

        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
        />

        {/* User Form Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingUser ? 'Edit User' : 'Create User'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Department"
                  value={formData.department}
                  onChangeText={(text) => setFormData({ ...formData, department: text })}
                />

                {/* Role Selection */}
                <Text style={styles.fieldLabel}>Role</Text>
                <View style={styles.roleContainer}>
                  {(['sales_rep', 'manager', 'admin'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        formData.role === role && styles.roleOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, role })}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          formData.role === role && styles.roleOptionTextSelected,
                        ]}
                      >
                        {role.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Team Selection */}
                <Text style={styles.fieldLabel}>Team</Text>
                <View style={styles.teamContainer}>
                  {teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.teamOption,
                        formData.teamId === team.id && styles.teamOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, teamId: team.id })}
                    >
                      <Text
                        style={[
                          styles.teamOptionText,
                          formData.teamId === team.id && styles.teamOptionTextSelected,
                        ]}
                      >
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {editingUser ? 'Update' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ManagerOrAdmin>
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
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unauthorizedText: {
    marginTop: 20,
    fontSize: 18,
    color: '#6c757d',
    textAlign: 'center',
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
  listContainer: {
    padding: 20,
  },
  userCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userDetails: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 5,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  roleOptionTextSelected: {
    color: 'white',
  },
  teamContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  teamOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  teamOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  teamOptionText: {
    fontSize: 14,
    color: '#666',
  },
  teamOptionTextSelected: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});