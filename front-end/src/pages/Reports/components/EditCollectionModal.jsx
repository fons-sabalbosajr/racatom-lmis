import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Form, Input, Button, message, Popconfirm, Typography } from 'antd';
import api from '../../../utils/axios';
import './EditCollectionModal.css';

const { TabPane } = Tabs;
const { Text } = Typography;

const EditCollectionModal = ({ visible, onCancel, collection, onSuccess }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('edit');
  const [newReferenceNo, setNewReferenceNo] = useState('');

  useEffect(() => {
    if (collection) {
      form.setFieldsValue(collection);
    }
  }, [collection, form]);

  const handleUpdate = async (values) => {
    try {
      const res = await api.put(`/loan-collections/${collection._id}`, values);
      if (res.data.success) {
        message.success('Collection updated successfully');
        onSuccess();
      } else {
        message.error('Failed to update collection');
      }
    } catch (err) {
      console.error(err);
      message.error('Error updating collection');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await api.delete(`/loan-collections/${collection._id}`);
      if (res.data.success) {
        message.success('Collection deleted successfully');
        onSuccess();
      } else {
        message.error('Failed to delete collection');
      }
    } catch (err) {
      console.error(err);
      message.error('Error deleting collection');
    }
  };

  const handleChangeReference = async () => {
    if (!newReferenceNo) {
      message.error('New Reference No cannot be empty');
      return;
    }
    try {
      const res = await api.put(`/loan-collections/change-ref/${collection._id}`, { newReferenceNo });
      if (res.data.success) {
        message.success('Reference number updated successfully');
        onSuccess();
      } else {
        message.error('Failed to update reference number');
      }
    } catch (err) {
      console.error(err);
      message.error('Error updating reference number');
    }
  };

  return (
    <Modal
      title="Edit Collection"      visible={visible}
      onCancel={onCancel}
      footer={null}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Edit" key="edit">
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <Form.Item name="CollectorName" label="Collector Name">
              <Input />
            </Form.Item>
            <Form.Item name="PaymentMode" label="Payment Mode">
              <Input />
            </Form.Item>
            <Form.Item name="CollectionPayment" label="Amount">
              <Input />
            </Form.Item>
            <Form.Item name="CollectionReferenceNo" label="Reference No">
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Save Changes
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        <TabPane tab="Settings" key="settings">
          <div style={{ marginBottom: 24 }}>
            <h4>Change Reference Number</h4>
            <div style={{ marginBottom: 8 }}>
              <Text>Current Reference No: {collection?.CollectionReferenceNo}</Text>
            </div>
            <Input
              placeholder="New Reference No"
              value={newReferenceNo}
              onChange={(e) => setNewReferenceNo(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <Button onClick={handleChangeReference}>Save</Button>
          </div>
          <div className="danger-zone" style={{ textAlign: 'center' }}>
            <h4>Danger Zone</h4>
            <Popconfirm
              title="Are you sure you want to delete this collection?"
              onConfirm={handleDelete}
              okText="Yes"
              cancelText="No"
            >
              <Button danger className="delete-button">
                Delete Collection
              </Button>
            </Popconfirm>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default EditCollectionModal;