import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Dialog,
  Form,
  Input,
  Select,
  MessagePlugin,
  Tag,
} from 'tdesign-react';
import { PlusIcon, EditIcon, DeleteIcon } from 'tdesign-icons-react';

const { FormItem } = Form;

interface Agent {
  id: number;
  name: string;
  walletAddress: string;
  type: string;
  isActive: boolean;
  balance: string;
  createdAt: string;
}

const Agents: React.FC = () => {
  const [agents] = useState<Agent[]>([
    {
      id: 1,
      name: '营销智能体 Alpha',
      walletAddress: '0x1234...5678',
      type: 'MARKETING',
      isActive: true,
      balance: '10.5',
      createdAt: '2024-01-15',
    },
    {
      id: 2,
      name: '供应链智能体 Beta',
      walletAddress: '0xabcd...efgh',
      type: 'SUPPLY_CHAIN',
      isActive: true,
      balance: '25.8',
      createdAt: '2024-01-16',
    },
    {
      id: 3,
      name: '内容创作智能体 Gamma',
      walletAddress: '0x9876...4321',
      type: 'CONTENT',
      isActive: false,
      balance: '0.0',
      createdAt: '2024-01-17',
    },
  ]);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const columns = [
    {
      colKey: 'id',
      title: 'ID',
      width: 80,
    },
    {
      colKey: 'name',
      title: '名称',
      width: 200,
    },
    {
      colKey: 'walletAddress',
      title: '钱包地址',
      width: 150,
    },
    {
      colKey: 'type',
      title: '类型',
      width: 120,
      cell: ({ row }: { row: Agent }) => {
        const typeMap: Record<string, string> = {
          MARKETING: '营销',
          SUPPLY_CHAIN: '供应链',
          CONTENT: '内容',
          COMPUTE: '算力',
          ANALYTICS: '分析',
        };
        return <Tag theme="primary">{typeMap[row.type] || row.type}</Tag>;
      },
    },
    {
      colKey: 'isActive',
      title: '状态',
      width: 100,
      cell: ({ row }: { row: Agent }) => {
        return row.isActive ? (
          <Tag theme="success">活跃</Tag>
        ) : (
          <Tag theme="default">停用</Tag>
        );
      },
    },
    {
      colKey: 'balance',
      title: '余额',
      width: 100,
      cell: ({ row }: { row: Agent }) => `${row.balance} ETH`,
    },
    {
      colKey: 'createdAt',
      title: '创建时间',
      width: 120,
    },
    {
      colKey: 'action',
      title: '操作',
      width: 150,
      cell: ({ row }: { row: Agent }) => (
        <Space>
          <Button
            size="small"
            variant="text"
            theme="primary"
            icon={<EditIcon />}
            onClick={() => handleEdit(row)}
          >
            编辑
          </Button>
          <Button
            size="small"
            variant="text"
            theme="danger"
            icon={<DeleteIcon />}
            onClick={() => handleDelete(row.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingAgent(null);
    setDialogVisible(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setDialogVisible(true);
  };

  const handleDelete = (id: number) => {
    MessagePlugin.confirm({
      content: '确定要删除该智能体吗？',
      onConfirm: () => {
        MessagePlugin.success('删除成功');
      },
    });
  };

  const handleSubmit = (values: any) => {
    console.log('Form values:', values);
    MessagePlugin.success(editingAgent ? '更新成功' : '创建成功');
    setDialogVisible(false);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1>智能体管理</h1>
        <Button
          theme="primary"
          icon={<PlusIcon />}
          onClick={handleAdd}
        >
          新增智能体
        </Button>
      </div>

      <Table
        data={agents}
        columns={columns}
        rowKey="id"
        bordered
        hover
      />

      <Dialog
        header={editingAgent ? '编辑智能体' : '新增智能体'}
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        width={600}
        footer={null}
      >
        <Form onSubmit={handleSubmit}>
          <FormItem name="name" label="名称" initialData={editingAgent?.name}>
            <Input placeholder="请输入智能体名称" />
          </FormItem>
          <FormItem name="walletAddress" label="钱包地址" initialData={editingAgent?.walletAddress}>
            <Input placeholder="请输入钱包地址" />
          </FormItem>
          <FormItem name="type" label="类型" initialData={editingAgent?.type}>
            <Select
              placeholder="请选择类型"
              options={[
                { value: 'MARKETING', label: '营销' },
                { value: 'SUPPLY_CHAIN', label: '供应链' },
                { value: 'CONTENT', label: '内容' },
                { value: 'COMPUTE', label: '算力' },
                { value: 'ANALYTICS', label: '分析' },
              ]}
            />
          </FormItem>
          <FormItem>
            <Space>
              <Button theme="primary" type="submit">
                确定
              </Button>
              <Button
                variant="outline"
                onClick={() => setDialogVisible(false)}
              >
                取消
              </Button>
            </Space>
          </FormItem>
        </Form>
      </Dialog>
    </div>
  );
};

export default Agents;
