#include<stdio.h>
#include<stdlib.h>
void main()
{
    void readar(int *a,int *n);
    void writear(int *a,int n);
    int a[20],n;
    readar(a,&n);
    writear(a,n);

}
void readar(int *a,int *n)
{
    int i;
    printf("Enter the size of array=\n");
    scanf("%d",n);
    for(i=1;i<=*n;i++)
        scanf("%d",a[i]);
}
void writear(int *a,int n)
{
    int i;
    printf("Elements are=\n");
        printf("%d",&a[i]);
}