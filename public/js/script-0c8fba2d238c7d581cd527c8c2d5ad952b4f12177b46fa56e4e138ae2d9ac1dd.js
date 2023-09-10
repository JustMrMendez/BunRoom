
	let path = "/test";

                document.addEventListener('DOMContentLoaded', () => {
                    
                        let path = '';
                        Object.defineProperty(window, 'path', {
                            get: () => path,
                            set: (value) => {
                                path = value;
                            }
                        });
                    
                });
            