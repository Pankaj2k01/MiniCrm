import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, Card, Paragraph } from 'react-native-paper';

const CustomerFormScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Customer Form</Title>
          <Paragraph>Customer form functionality will be implemented here.</Paragraph>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    elevation: 4,
  },
});

export default CustomerFormScreen;