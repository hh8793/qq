import React from 'react';
import { Layout as TLayout, Menu, Breadcrumb } from 'tdesign-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  UserIcon,
  TransactionIcon,
  CalendarIcon,
  ServiceIcon,
} from 'tdesign-icons-react';

const { Header, Sider, Content } = TLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { value: '/', label: '仪表盘', icon: <HomeIcon /> },
    { value: '/agents', label: '智能体管理', icon: <UserIcon /> },
    { value: '/settlements', label: '结算管理', icon: <TransactionIcon /> },
    { value: '/subscriptions', label: '订阅管理', icon: <CalendarIcon /> },
    { value: '/services', label: '服务管理', icon: <ServiceIcon /> },
  ];

  const handleMenuChange = (value: string) => {
    navigate(value);
  };

  const getBreadcrumbItems = () => {
    const path = location.pathname;
    const items = [{ value: '/', label: '首页' }];
    
    if (path !== '/') {
      const menuItem = menuItems.find(item => item.value === path);
      if (menuItem) {
        items.push({ value: path, label: menuItem.label });
      }
    }
    
    return items;
  };

  return (
    <TLayout>
      <Sider width={200} style={{ height: '100vh', position: 'fixed', left: 0, top: 0 }}>
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
        }}>
          AgentLink
        </div>
        <Menu
          value={location.pathname}
          onChange={handleMenuChange}
          items={menuItems}
        />
      </Sider>
      <TLayout style={{ marginLeft: '200px' }}>
        <Header>
          <Breadcrumb items={getBreadcrumbItems()} />
        </Header>
        <Content>
          {children}
        </Content>
      </TLayout>
    </TLayout>
  );
};

export default Layout;
