export const queueStatusMapper = {
  getLabel: (status) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'Chờ check-in';
      case 'CheckedIn':
      case 'CheckIn':
        return 'Đã check-in';
      case 'Washing':
      case 'FoamWashing':
        return 'Đang rửa xe';
      case 'Drying':
        return 'Đang sấy khô';
      case 'Completed':
      case 'Archived':
      case 'Checkout':
        return 'Hoàn tất';
      case 'Cancelled':
        return 'Đã hủy';
      case 'NoShow':
        return 'Khách không đến';
      default:
        return 'Chờ check-in';
    }
  },

  getBadgeClass: (status) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'bg-warning bg-opacity-10 text-warning';
      case 'CheckedIn':
      case 'CheckIn':
      case 'Washing':
      case 'FoamWashing':
      case 'Drying':
        return 'bg-primary bg-opacity-10 text-primary';
      case 'Completed':
      case 'Archived':
      case 'Checkout':
        return 'bg-success bg-opacity-10 text-success';
      case 'Cancelled':
      case 'NoShow':
        return 'bg-danger bg-opacity-10 text-danger';
      default:
        return 'bg-secondary bg-opacity-10 text-muted';
    }
  },

  getIcon: (status) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'fa-clock';
      case 'CheckedIn':
      case 'CheckIn':
        return 'fa-qrcode';
      case 'Washing':
      case 'FoamWashing':
        return 'fa-soap';
      case 'Drying':
        return 'fa-wind';
      case 'Completed':
      case 'Archived':
      case 'Checkout':
        return 'fa-check-circle';
      default:
        return 'fa-hourglass-start';
    }
  },

  getTimelineSteps: (bookingStatus, queueStatus, currentStage) => {
    const steps = [
      { id: 'CheckedIn', name: 'Đã check-in' },
      { id: 'Washing', name: 'Rửa xe' },
      { id: 'Drying', name: 'Sấy khô' },
      { id: 'Completed', name: 'Hoàn tất' }
    ];

    let activeIndex = -1;
    
    if (bookingStatus === 'Checkout' || queueStatus === 'Archived' || currentStage === 'Checkout' ||
        bookingStatus === 'Completed' || queueStatus === 'Completed' || currentStage === 'Completed') {
      activeIndex = 4;
    } else {
      const stage = currentStage || '';
      if (stage === 'CheckIn' || stage === 'CheckedIn' || bookingStatus === 'CheckedIn') {
        activeIndex = 0;
      } else if (stage === 'Washing') {
        activeIndex = 1;
      } else if (stage === 'Drying') {
        activeIndex = 2;
      }
    }

    return steps.map((step, idx) => {
      const isCompleted = activeIndex !== -1 && idx < activeIndex;
      const isActive = activeIndex !== -1 && idx === activeIndex;
      return {
        name: step.name,
        isCompleted,
        isActive
      };
    });
  }
};
