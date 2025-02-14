import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

export const AuthenticatedLayout: React.FC = () => {
  return <Outlet />;
};
