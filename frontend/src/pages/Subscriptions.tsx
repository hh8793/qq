import React from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
} from 'tdesign-react';

interface Subscription {
  id: number;
  subscriber: string;
  provider: string;
  serviceName: string;
  amount: string;
  billingCycle: string;
  nextBillingDate: string;
  isActive: boolean;
  createdAt: string;
}

const Subscriptions: React.FC = () => {
  const [subscriptions] = useState<Subscription[]>([
    {
      id: 1,
      subscriber: '营销智能体 Alpha',
      provider: '内容创作智能体 Gamma',
      serviceName: '月度内容生成',
      amount: '5.0',
      billingCycle: '30天',
      nextBillingDate: '2024-02-20',
      isActive: true,
      createdAt: '2024-01-20',
    },
    {
      id: 2,
      subscriber: '供应链智能体 Beta',
      provider: '算力服务智能体 Delta',
      serviceName: '算力服务包',
      amount: '15.0',
      billingCycle: '7天',
      nextBillingDate: '2024-01-25',
      isActive: true,
      createdAt: '2024-01-18',
    },
    {
      id: 3,
      subscriber: '营销智能体 Alpha',
      provider: '数据分析智能体 Epsilon',
      serviceName: '数据分析服务',
      amount: '8.0',
      billingCycle: '15天',
      nextBillingDate: '2024-01-30',
      isActive: false,
      createdAt: '2024-01-15',
    },
  ]);

  const columns = [
    {
      colKey: 'id',
      title: 'ID',
      width: 80,
    },
    {
      colKey: 'subscriber',
      title: '订阅者',
      width: 150,
    },
    {
      colKey: 'provider',
      title: '提供者',
      width: 150,
    },
    {
      colKey: 'serviceName',
      title: '服务名称',
      width: 150,
    },
    {
      colKey: 'amount',
      title: '金额',
      width: 100,
      cell: ({ row }: { row: Subscription }) => `${row.amount} ETH`,
    },
    {
      colKey: 'billingCycle',
      title: '计费周期',
      width: 100,
    },
    {
      colKey: 'nextBillingDate',
      title: '下次计费日期',
      width: 120,
    },
    {
      colKey: 'isActive',
      title: '状态',
      width: 100,
      cell: ({ row }: { row: Subscription }) => {
        return row.isActive ? (
          <Tag theme="success">活跃</Tag>
        ) : (
          <Tag theme="default">已取消</Tag>
        );
      },
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
      cell: ({ row }: { row: Subscription }) => (
        <Space>
          <Button
            size="small"
            variant="text"
            theme="primary"
            onClick={() => handleProcess(row.id)}
            disabled={!row.isActive}
          >
            立即计费
          </Button>
          <Button
            size="small"
            variant="text"
            theme="danger"
            onClick={() => handleCancel(row.id)}
            disabled={!row.isActive}
          >
            取消订阅
          </Button>
        </Space>
      ),
    },
  ];

  const handleProcess = (id: number) => {
    console.log('Process payment for subscription:', id);
  };

  const handleCancel = (id: number) => {
    console.log('Cancel subscription:', id);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>订阅管理</h1>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic title="总订阅数" value={89} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃订阅" value={76} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="月度收入" value={1250.0} suffix="ETH" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待处理计费" value={23} />
          </Card>
        </Col>
      </Row>

      <Table
        data={subscriptions}
        columns={columns}
        rowKey="id"
        bordered
        hover
      />
    </div>
  );
};

export default Subscriptions;
