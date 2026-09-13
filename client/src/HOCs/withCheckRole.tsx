import React from 'react';
import { PERMISSION_ENUM } from '@/consts/common';
import { useAuth } from '@/providers/AuthenticationProvider';

const withCheckRole = (
  ComponentWrapped: React.ComponentType<any>,
  permission?: (PERMISSION_ENUM | '' | string)[]
) => {
  return () => {
    const { user } = useAuth();
    const role = user?.role || PERMISSION_ENUM.EMPLOYEE;
    const havePermission =
      permission?.includes(role) || permission?.includes(PERMISSION_ENUM.PUBLIC);

    if (havePermission) {
      return <ComponentWrapped />;
    }

    return (
      <span>{`You're not have permission to access this!`}</span>
    );
  };
};

export default withCheckRole;
