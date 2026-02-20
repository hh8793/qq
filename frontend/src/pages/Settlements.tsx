import React from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  TabPanel,
} from 'tdesign-react';

interface Transaction {
  id: number;
  transactionHash: string;
  fromAgent: string;
  toAgent: string;
  amount: string;
  serviceType: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

const Settlements: React.FC = () => {
  const [transactions] = useState<Transaction[]>([
    {
      id: 1,
      transactionHash: '0xabcd...1234',
      fromAgent: '营销智能体 Alpha',
      toAgent: '供应链智能体 Beta',
      amount: '2.5',
      serviceType: '素材生成',
      status: 'COMPLETED',
      createdAt: '2024-01-20 10:30:00',
    },
    {
      id: 2,
      transactionHash: '0xefgh...5678',
      fromAgent: '内容创作智能体 Gamma',
      toAgent: '营销智能体 Alpha',
      amount: '1.8',
      serviceType: '内容创作',
      status: 'PENDING',
      createdAt: '2024-01-20 11:15:00',
    },
    {
      id: 3,
      transactionHash: '0xijkl...9012',
      fromAgent: '算力服务智能体 Delta',
      toAgent: '数据分析智能体 Epsilon',
      amount: '5.2',
      serviceType: '算力服务',
      status: 'COMPLETED',
      createdAt: '2024-01-19 15:45:00',
    },
    {
      id: 4,
      transactionHash: '0xmnpq...3456',
      fromAgent: '营销智能体 Alpha',
      toAgent: '内容创作智能体 Gamma',
      amount: '0.0',
      serviceType: '按效付费',
      status: 'FAILED',
      createdAt: '2024-01-19 09:20:00',
    },
  ]);

  const columns = [
    {
      colKey: 'id',
      title: 'ID',
      width: 80,
    },
    {
      colKey: 'transactionHash',
      title: '交易哈希',
      width: 150,
    },
    {
      colKey: 'fromAgent',
      title: '付款方',
      width: 150,
    },
    {
      colKey: 'toAgent',
      title: '收款方',
      width: 150,
    },
    {
      colKey: 'amount',
      title: '金额',
      width: 100,
      cell: ({ row }: { row: Transaction }) => `${row.amount} ETH`,
    },
    {
      colKey: 'serviceType',
      title: '服务类型',
      width: 120,
    },
    {
      colKey: 'status',
      title: '状态',
      width: 100,
      cell: ({ row }: { row: Transaction }) => {
        const statusMap: Record<string, { theme: any; text: string }> = {
          PENDING: { theme: 'warning', text: '待处理' },
          COMPLETED: { theme: 'success', text: '已完成' },
          FAILED: { theme: 'danger', text: '失败' },
          REFUNDED: { theme: 'default', text: '已退款' },
        };
        const { theme, text } = statusMap[row.status];
        return <Tag theme={theme}>{text}</Tag>;
      },
    },
    {
      colKey: 'createdAt',
      title: '创建时间',
      width: 180,
    },
    {
      colKey: 'action',
      title: '操作',
      width: 150,
      cell: ({ row }: { row: Transaction }) => (
        <Space>
          <Button
            size="small"
            variant="text"
            theme="primary"
            onClick={() => handleVerify(row.id)}
            disabled={row.status !== 'PENDING'}
          >
            验证
          </Button>
          <Button
            size="small"
            variant="text"
            theme="default"
            onClick={() => handleView(row.id)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  const handleVerify = (id: number) => {
    console.log('Verify transaction:', id);
  };

  const handleView = (id: number) => {
    console.log('View transaction:', id);
  };

  const statistics = [
    { label: '总交易数', value: '1,248' },
    { label: '已完成', value: '1,156' },
    { label: '待处理', value: '68' },
    { label: '失败', value: '24' },
    { label: '总金额', value: '2,850.5 ETH' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>结算管理</h1>

      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {statistics.map((stat, index) => (
          <div
            key={index}
            style={{
              flex: '1',
              minWidth: '200px',
              padding: '16px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e8e8e8',
            }}
          >
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultActiveKey="1">
        <TabPanel value="1" label="全部交易">
          <Table
            data={transactions}
            columns={columns}
            rowKey="id"
            bordered
            hover
          />
        </TabPanel>
        <TabPanel value="2" label="待处理">
          <Table
            data={transactions.filter(t => t.status === 'PENDING')}
            columns={columns}
            rowKey="id"
            bordered
            hover
          />
        </TabPanel>
        <TabPanel value="3" label="已完成">
          <Table
            data={transactions.filter(t => t.status === 'COMPLETED')}
            columns={columns}
            rowKey="id"
            bordered
            hover
          />
        </TabPanel>
        <TabPanel value="4" label="失败">
          <Table
            data={transactions.filter(t => t.status === 'FAILED')}
            columns={columns}
            rowKey="id"
            bordered
            hover
          />
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default Settlements;
