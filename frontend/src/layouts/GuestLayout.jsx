import { Outlet } from 'react-router-dom';
import { GlobalToastAndConfirm } from '../components/GlobalToastAndConfirm';
import '../styles/shared.css';

export const GuestLayout = () => {
  return (
    <>
      <GlobalToastAndConfirm />
      <Outlet />
    </>
  );
};
export default GuestLayout;
